/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JSONSchema7 } from 'json-schema';
import { isEqual, omit } from 'lodash';
import type { WorkflowYaml } from '@kbn/workflows';
import {
  applyInputDefaults,
  getInputsFromDefinition,
  normalizeFieldsToJsonSchema,
  resolveRef,
} from '@kbn/workflows/spec/lib/field_conversion';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { isRecord } from '@kbn/workflows-yaml';
import { collectWorkflowOutputBlocks, getOutputStepNames } from './find_call_sites';
import type { ContractChange, ContractField, WorkflowContract } from './types';
import { alwaysEndsInOutputStep, getReturnedOutputNames } from '../get_returned_output_names';

/** Reads a field only when `record` has it itself, so names like `constructor` aren't inherited. */
export const getOwn = <T>(record: Readonly<Record<string, T>>, key: string): T | undefined =>
  Object.hasOwn(record, key) ? record[key] : undefined;
const describeType = ({ type }: JSONSchema7): string | undefined => {
  if (Array.isArray(type)) {
    return type.every((item) => typeof item === 'string') ? type.join(' | ') : undefined;
  }
  return typeof type === 'string' ? type : undefined;
};

/** The values a run fills in for omitted inputs, including `$ref`, nested and empty-array defaults. */
export const getRuntimeInputDefaults = (
  inputsSchema: JsonModelSchemaType | undefined
): Record<string, unknown> => applyInputDefaults(undefined, inputsSchema) ?? {};

const resolveProperty = (rawProperty: unknown, schema: JsonModelSchemaType): JSONSchema7 => {
  const declared = (isRecord(rawProperty) ? rawProperty : {}) as JSONSchema7;
  return declared.$ref ? (resolveRef(declared.$ref, schema) ?? declared) : declared;
};

const toFields = (
  schema: JsonModelSchemaType | undefined,
  defaults?: Readonly<Record<string, unknown>>
): Record<string, ContractField> => {
  const fields: Record<string, ContractField> = {};
  if (!schema) {
    return fields;
  }
  // A draft being typed can hold anything here.
  const required = new Set(Array.isArray(schema.required) ? schema.required : []);
  for (const [name, rawProperty] of Object.entries(schema.properties ?? {})) {
    const property = resolveProperty(rawProperty, schema);
    fields[name] = {
      name,
      type: describeType(property),
      required: required.has(name),
      hasDefault: defaults ? getOwn(defaults, name) !== undefined : property.default !== undefined,
      enumValues: property.enum,
      schema: property,
    };
  }
  // Runs require these keys too, checked against the `additionalProperties` schema.
  const additional = toAdditionalInputsField(schema);
  for (const name of required) {
    if (additional && typeof name === 'string' && !getOwn(fields, name)) {
      fields[name] = { ...additional, name, required: true };
    }
  }
  return fields;
};

const toAdditionalInputsField = (
  schema: JsonModelSchemaType | undefined
): ContractField | undefined => {
  const additional = schema?.additionalProperties;
  if (!schema || !isRecord(additional)) {
    return undefined;
  }
  const property = resolveProperty(additional, schema);
  return {
    name: '',
    type: describeType(property),
    required: false,
    hasDefault: false,
    enumValues: property.enum,
    schema: property,
  };
};

const inferOutputFields = (definition: unknown): Record<string, ContractField> => {
  const fields: Record<string, ContractField> = {};
  for (const block of collectWorkflowOutputBlocks(definition)) {
    for (const name of Object.keys(block)) {
      fields[name] = { name, required: false, hasDefault: false };
    }
  }
  return fields;
};

// Drafts can have any shape, and the schema helpers expect `triggers` to be a list of objects.
const getInputsSchema = (definition: unknown): JsonModelSchemaType | undefined => {
  if (!isRecord(definition)) {
    return undefined;
  }
  const { triggers } = definition;
  return getInputsFromDefinition({
    ...definition,
    triggers: Array.isArray(triggers) ? triggers.filter(isRecord) : undefined,
  } as Partial<WorkflowYaml>);
};

/** Extracts the inputs a workflow declares, without the rest of its contract. */
export const extractInputFields = (definition: unknown): Record<string, ContractField> => {
  const inputsSchema = getInputsSchema(definition);
  return toFields(inputsSchema, getRuntimeInputDefaults(inputsSchema));
};

const buildWorkflowContract = (definition: unknown): WorkflowContract => {
  const inputsSchema = getInputsSchema(definition);
  const inputDefaults = getRuntimeInputDefaults(inputsSchema);
  const additionalInputs = toAdditionalInputsField(inputsSchema);
  const declaredOutputs = normalizeFieldsToJsonSchema(
    isRecord(definition) ? definition.outputs : undefined
  );
  const returnedOutputs = getReturnedOutputNames(definition);
  const returnedNames = returnedOutputs ? new Set(returnedOutputs) : undefined;

  const base = {
    // A workflow saved with errors is stored without a definition (and turned off).
    valid: isRecord(definition),
    enabled: isRecord(definition) && definition.enabled !== false,
    inputs: toFields(inputsSchema, inputDefaults),
    inputDefaults,
    inputsSchema: inputsSchema?.properties || additionalInputs ? inputsSchema : undefined,
    rejectsUnknownInputs: inputsSchema?.additionalProperties === false,
    additionalInputs,
    alwaysReturnsOutput: alwaysEndsInOutputStep(definition),
    returnedOutputs,
    outputStepNames: getOutputStepNames(definition),
  };

  if (declaredOutputs?.properties) {
    const outputs = toFields(declaredOutputs);
    return {
      ...base,
      outputs,
      outputsSource: 'declared',
      unreturnedOutputs: returnedNames
        ? Object.keys(outputs).filter((name) => !returnedNames.has(name))
        : [],
    };
  }

  const inferredOutputs = inferOutputFields(definition);
  return {
    ...base,
    outputs: inferredOutputs,
    outputsSource: Object.keys(inferredOutputs).length > 0 ? 'inferred' : 'none',
    unreturnedOutputs: [],
  };
};

// Contracts by definition, since every call to a workflow is checked against the same one.
const contractCache = new WeakMap<object, WorkflowContract>();

/** Extracts the input/output contract a workflow exposes to the workflows that call it. */
export const extractWorkflowContract = (definition: unknown): WorkflowContract => {
  if (!isRecord(definition)) {
    return buildWorkflowContract(definition);
  }
  let contract = contractCache.get(definition);
  if (!contract) {
    contract = buildWorkflowContract(definition);
    contractCache.set(definition, contract);
  }
  return contract;
};

const toTypeSet = (type?: string): string[] | undefined => type?.split(' | ');

const acceptsType = (accepted: readonly string[], type: string): boolean =>
  accepted.includes(type) || (type === 'integer' && accepted.includes('number'));

/** True when every value of type `inner` is also a valid `outer`; an undefined type means any value. */
export const isTypeWithin = (inner?: string, outer?: string): boolean => {
  const outerTypes = toTypeSet(outer);
  if (!outerTypes) {
    return true;
  }
  const innerTypes = toTypeSet(inner);
  return innerTypes ? innerTypes.every((type) => acceptsType(outerTypes, type)) : false;
};

/** True when some values are valid for both types. */
export const typesOverlap = (first?: string, second?: string): boolean => {
  const firstTypes = toTypeSet(first);
  const secondTypes = toTypeSet(second);
  if (!firstTypes || !secondTypes) {
    return true;
  }
  return firstTypes.some(
    (type) =>
      acceptsType(secondTypes, type) || (type === 'number' && secondTypes.includes('integer'))
  );
};

const isEnumWithin = (inner?: readonly unknown[], outer?: readonly unknown[]): boolean => {
  if (!outer) {
    return true;
  }
  return inner ? inner.every((value) => outer.some((allowed) => isEqual(allowed, value))) : false;
};

// Everything about a field's schema other than what is compared on its own.
const SEPARATELY_COMPARED_KEYS = ['type', 'enum', 'default', 'description', 'title', 'examples'];
/** True when nested shapes or constraints of a field changed (anything but type, enum and docs). */
export const hasSchemaDetailChange = (saved: ContractField, draft: ContractField): boolean =>
  !isEqual(
    omit(saved.schema ?? {}, SEPARATELY_COMPARED_KEYS),
    omit(draft.schema ?? {}, SEPARATELY_COMPARED_KEYS)
  );

/** True when the field limits values beyond their type (an enum, a range, a pattern, a shape...). */
export const hasConstraintsBeyondType = (field: ContractField): boolean =>
  Boolean(field.enumValues) ||
  Object.keys(omit(field.schema ?? {}, SEPARATELY_COMPARED_KEYS)).length > 0;

/** True when the draft field accepts fewer values than the saved one at the type or enum level. */
export const isFieldNarrowed = (saved: ContractField, draft: ContractField): boolean =>
  !isTypeWithin(saved.type, draft.type) || !isEnumWithin(saved.enumValues, draft.enumValues);

const isBlockingRequired = (field: ContractField): boolean => field.required && !field.hasDefault;

const diffInputField = (savedField: ContractField, draftField: ContractField): ContractChange[] => {
  const { name } = draftField;
  const changes: ContractChange[] = [];
  if (!isBlockingRequired(savedField) && isBlockingRequired(draftField)) {
    changes.push({ kind: 'inputBecameRequired', field: name, severity: 'breaking' });
  } else if (isBlockingRequired(savedField) && !isBlockingRequired(draftField)) {
    changes.push({ kind: 'inputBecameOptional', field: name, severity: 'info' });
  }
  if (savedField.type !== draftField.type) {
    changes.push({
      kind: 'inputTypeChanged',
      field: name,
      severity: isTypeWithin(savedField.type, draftField.type) ? 'info' : 'breaking',
      from: savedField.type,
      to: draftField.type,
    });
  }
  if (!isEqual(savedField.enumValues, draftField.enumValues)) {
    changes.push({
      kind: 'inputAllowedValuesChanged',
      field: name,
      severity: isEnumWithin(savedField.enumValues, draftField.enumValues) ? 'info' : 'breaking',
    });
  }
  if (hasSchemaDetailChange(savedField, draftField)) {
    changes.push({ kind: 'inputSchemaChanged', field: name, severity: 'warning' });
  }
  return changes;
};

const diffInputs = (saved: WorkflowContract, draft: WorkflowContract): ContractChange[] => {
  const changes: ContractChange[] = [];
  for (const [name, draftField] of Object.entries(draft.inputs)) {
    const savedField = getOwn(saved.inputs, name);
    if (savedField) {
      changes.push(...diffInputField(savedField, draftField));
    } else {
      const required = isBlockingRequired(draftField);
      changes.push({
        kind: 'inputAdded',
        field: name,
        severity: required ? 'breaking' : 'info',
        to: draftField.type,
        required,
      });
    }
  }
  for (const name of Object.keys(saved.inputs)) {
    if (!getOwn(draft.inputs, name)) {
      changes.push({
        kind: 'inputRemoved',
        field: name,
        // Callers that still send it are no longer read, and fail only when the schema rejects
        // undeclared inputs.
        severity: draft.rejectsUnknownInputs ? 'breaking' : 'warning',
      });
    }
  }
  if (!saved.rejectsUnknownInputs && draft.rejectsUnknownInputs) {
    changes.push({ kind: 'unknownInputsRejected', field: '', severity: 'warning' });
  }
  const { additionalInputs: savedAdditional } = saved;
  const { additionalInputs: draftAdditional } = draft;
  if (savedAdditional && draftAdditional) {
    changes.push(...diffInputField(savedAdditional, draftAdditional));
  } else if (draftAdditional && !saved.rejectsUnknownInputs) {
    // Undeclared inputs were accepted as they were, and are now checked against a schema.
    changes.push({ kind: 'inputSchemaChanged', field: '', severity: 'warning' });
  }
  return changes;
};

const diffOutputs = (saved: WorkflowContract, draft: WorkflowContract): ContractChange[] => {
  const changes: ContractChange[] = [];
  const savedUnreturned = new Set(saved.unreturnedOutputs);
  const draftUnreturned = new Set(draft.unreturnedOutputs);
  for (const [name, draftField] of Object.entries(draft.outputs)) {
    const savedField = getOwn(saved.outputs, name);
    if (savedField && !savedUnreturned.has(name) && draftUnreturned.has(name)) {
      changes.push({ kind: 'outputNoLongerReturned', field: name, severity: 'breaking' });
    }
    if (!savedField) {
      changes.push({ kind: 'outputAdded', field: name, severity: 'info', to: draftField.type });
    } else {
      if (savedField.type && savedField.type !== draftField.type) {
        changes.push({
          kind: 'outputTypeChanged',
          field: name,
          // Callers only notice when the output can now hold values it couldn't before.
          severity: isTypeWithin(draftField.type, savedField.type) ? 'info' : 'warning',
          from: savedField.type,
          to: draftField.type,
        });
      }
      if (hasSchemaDetailChange(savedField, draftField)) {
        changes.push({ kind: 'outputSchemaChanged', field: name, severity: 'warning' });
      }
    }
  }
  for (const name of Object.keys(saved.outputs)) {
    if (!getOwn(draft.outputs, name)) {
      changes.push({
        kind: 'outputRemoved',
        field: name,
        // Undeclared values a `workflow.output` step sets still reach callers.
        severity: draft.returnedOutputs?.includes(name) ? 'warning' : 'breaking',
      });
    }
  }
  if (
    saved.alwaysReturnsOutput &&
    !draft.alwaysReturnsOutput &&
    Object.keys(saved.outputs).length > 0
  ) {
    changes.push({ kind: 'outputStepRemoved', field: '', severity: 'warning' });
  }
  return changes;
};

const getStateChanges = (saved: WorkflowContract, draft: WorkflowContract): ContractChange[] => {
  if (saved.valid && !draft.valid) {
    return [{ kind: 'invalid', field: '', severity: 'breaking' }];
  }
  if (saved.enabled && !draft.enabled) {
    return [{ kind: 'disabled', field: '', severity: 'breaking' }];
  }
  return [];
};

const SEVERITY_ORDER = { breaking: 0, warning: 1, info: 2 } as const;

/** Lists the contract changes between the saved and the draft version of a workflow. */
export const diffWorkflowContracts = (
  saved: WorkflowContract,
  draft: WorkflowContract
): ContractChange[] =>
  [
    ...getStateChanges(saved, draft),
    ...diffInputs(saved, draft),
    ...diffOutputs(saved, draft),
  ].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
