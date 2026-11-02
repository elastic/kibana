/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX,
  builtinWorkflowInputDefinitions,
  type JsonSchema,
} from '@kbn/workflows';
import { INLINE_WORKFLOW_INPUTS, INPUTS } from '../constants';
import type { PayloadVariable } from './types';

// Template context of an inline action policy workflow; only its trigger inputs are exposed.
const WORKFLOW_CONTEXT_SCHEMA: JsonSchema = {
  type: 'object',
  properties: { [INPUTS]: INLINE_WORKFLOW_INPUTS },
  required: [INPUTS],
};

const ARRAY_INDEX = /^\d+$/;

const resolveInputDefinitionRef = (schema: JsonSchema | undefined): JsonSchema | undefined => {
  const ref = schema?.$ref;
  if (!ref?.startsWith(KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX)) {
    return schema;
  }
  return builtinWorkflowInputDefinitions[
    ref.slice(KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX.length)
  ];
};

const getArrayItemSchema = (schema: JsonSchema): JsonSchema | undefined =>
  Array.isArray(schema.items) ? schema.items[0] : schema.items;

const getMapValueSchema = (schema: JsonSchema): JsonSchema | undefined =>
  typeof schema.additionalProperties === 'object' ? schema.additionalProperties : undefined;

// Array indexes resolve to the item schema; unknown keys resolve to the map value schema.
const getChildSchema = (
  schema: JsonSchema | undefined,
  segment: string
): JsonSchema | undefined => {
  if (!schema) {
    return undefined;
  }
  if (ARRAY_INDEX.test(segment) && schema.items) {
    return resolveInputDefinitionRef(getArrayItemSchema(schema));
  }
  const { properties } = schema;
  const property =
    properties && Object.hasOwn(properties, segment) ? properties[segment] : undefined;
  return resolveInputDefinitionRef(property ?? getMapValueSchema(schema));
};

const describeType = (schema: JsonSchema): string => {
  if (schema.enum) {
    return schema.enum
      .map((value) => (typeof value === 'string' ? `'${value}'` : String(value)))
      .join(' | ');
  }
  const types = Array.isArray(schema.type) ? schema.type : [schema.type ?? 'unknown'];
  return types
    .map((type) => {
      const itemSchema =
        type === 'array' ? resolveInputDefinitionRef(getArrayItemSchema(schema)) : undefined;
      return itemSchema ? `${describeType(itemSchema)}[]` : type;
    })
    .join(' | ');
};

const describeField = (description: string, isOptional: boolean): string =>
  isOptional
    ? i18n.translate('xpack.alertingV2.alertingV2RuleForm.actionForm.params.optionalVariable', {
        defaultMessage: '{description} (optional)',
        values: { description },
      })
    : description;

/**
 * Returns the variables nested under `path` in the inline action policy workflow context
 * (e.g. `['inputs', 'payload']`), derived from the workflow's trigger inputs schema.
 */
export const getContextVariables = (path: readonly string[]): PayloadVariable[] => {
  const schema = path.reduce<JsonSchema | undefined>(getChildSchema, WORKFLOW_CONTEXT_SCHEMA);
  const required = new Set(schema?.required);

  return Object.entries(schema?.properties ?? {}).map(([key, property]) => {
    const resolved = resolveInputDefinitionRef(property) ?? property;
    return {
      path: key,
      detail: describeType(resolved),
      documentation: describeField(resolved.description ?? '', !required.has(key)),
    };
  });
};
