/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/v1';
import { REQUIRED_TEMPLATE_ROOT_KEYS } from '../constants';
import { FIELD_TYPE_TITLES } from './field_type_titles';
import { ASSIGNEE_DEFAULT_SNIPPETS, FIELD_DEFAULT_SNIPPETS } from './template_field_snippets';
import * as i18n from '../translations';

/**
 * URI identifier for the template JSON Schema.
 * This is an arbitrary unique identifier used by monaco-yaml to associate
 * the schema with YAML files in the editor.
 * Note: This URI is displayed in Monaco hover tooltips as the schema source.
 */
export const TEMPLATE_SCHEMA_URI = 'kibana://cases/template-definition-schema';

interface OverrideCtx {
  zodSchema: z.core.$ZodTypes;
  jsonSchema: z.core.JSONSchema.BaseSchema;
  path: (string | number)[];
}

function applySchemaOverrides(ctx: OverrideCtx) {
  removeNullFromEditorSchema(ctx);
  removeAdditionalPropertiesFromAllOfItems(ctx);
  addBranchPropertyEnumHints(ctx);
  addDiscriminatorEnumHints(ctx);
  addUniqueItemsToOptionsArrays(ctx);
  addTitlesToOneOfBranches(ctx);
  disallowUnknownMetadataKeys(ctx);
  convertFieldUnionToIfThenChain(ctx);
  addRequiredRootKeys(ctx);
}

/**
 * Every control's `metadata` Zod schema uses `.catchall(z.unknown())`, so an author can type a
 * misspelled option key (e.g. `defualt`, `option`) and it is accepted silently, then ignored — a
 * documented gotcha that forces authors back to the reference docs. In JSON Schema the catchall
 * projects to `additionalProperties: true`, so monaco-yaml never flags the typo. Here we flip the
 * editor's `metadata` objects to `additionalProperties: false` so Monaco surfaces "property X is
 * not allowed" on an unknown key, turning a silent no-op into an actionable hint. This is
 * editor-only: runtime Zod validation (defined solely by the schema) stays lenient, so a stored
 * definition carrying an unknown key is never rejected on save.
 */
function disallowUnknownMetadataKeys(ctx: OverrideCtx) {
  if (ctx.path[ctx.path.length - 1] !== 'metadata') {
    return;
  }
  const schema = ctx.jsonSchema as Record<string, unknown>;
  if (schema.type === 'object' && schema.properties != null) {
    schema.additionalProperties = false;
  }
}

/**
 * The runtime schema keeps the case defaults nullable for back-compat (migrated / legacy-stored
 * definitions may carry `null`), which `z.toJSONSchema` faithfully reproduces as a `null` branch,
 * `type: [..., 'null']`, or a `null` enum member. In the editor that surfaces `null` as an
 * autocomplete suggestion (e.g. for `severity`), which we never want an author to pick. Strip the
 * `null` option from the generated schema so Monaco offers only real values — without loosening
 * runtime validation, which is defined solely by the Zod schema.
 */
function removeNullFromEditorSchema(ctx: OverrideCtx) {
  const schema = ctx.jsonSchema as Record<string, unknown>;
  const isNullBranch = (branch: unknown): boolean =>
    branch != null &&
    typeof branch === 'object' &&
    (branch as Record<string, unknown>).type === 'null';

  for (const unionKey of ['anyOf', 'oneOf'] as const) {
    const branches = schema[unionKey];
    if (Array.isArray(branches)) {
      const nonNullBranches = branches.filter((branch) => !isNullBranch(branch));
      if (nonNullBranches.length !== branches.length) {
        if (nonNullBranches.length === 1) {
          // Collapse a `<value> | null` union down to just the value schema.
          delete schema[unionKey];
          Object.assign(schema, nonNullBranches[0]);
        } else {
          schema[unionKey] = nonNullBranches;
        }
      }
    }
  }

  if (Array.isArray(schema.type)) {
    const nonNullTypes = (schema.type as string[]).filter((type) => type !== 'null');
    schema.type = nonNullTypes.length === 1 ? nonNullTypes[0] : nonNullTypes;
  }

  if (Array.isArray(schema.enum)) {
    schema.enum = (schema.enum as unknown[]).filter((value) => value !== null);
  }
}

/**
 * Case defaults and `fields` are always-present blocks in the editor YAML (see
 * seed_template_definition / validate_template_definition). Marking them `required` on the root
 * object gives Monaco an inline "missing property" hint when an author deletes one, matching the
 * programmatic completeness check (both read the shared REQUIRED_TEMPLATE_ROOT_KEYS). Runtime Zod
 * validation stays lenient — this only affects the editor's generated schema.
 */
function addRequiredRootKeys(ctx: OverrideCtx) {
  if (ctx.path.length !== 0) {
    return;
  }
  const schema = ctx.jsonSchema as Record<string, unknown>;
  if (schema.type !== 'object' || schema.properties == null) {
    return;
  }
  const required = new Set<string>(
    Array.isArray(schema.required) ? (schema.required as string[]) : []
  );
  for (const key of REQUIRED_TEMPLATE_ROOT_KEYS) {
    required.add(key);
  }
  schema.required = [...required];
}

/**
 * Generates the Monaco editor JSON Schema from the Zod definition schema, keeping editor validation
 * in sync with Zod. `settings` and `connector` are omitted: they are panel-owned (edited on the
 * Configuration tab, merged into the definition on save), never part of the editor buffer, so the
 * editor must not autocomplete/suggest them — otherwise a value typed in the Fields YAML would be
 * silently overwritten by the panel state on save. Based on workflows' get_workflow_json_schema.ts.
 */
export function getTemplateDefinitionJsonSchema(): z.core.JSONSchema.JSONSchema | null {
  try {
    const schema = z.toJSONSchema(
      ParsedTemplateDefinitionSchema.omit({ settings: true, connector: true }),
      {
        target: 'draft-7',
        unrepresentable: 'any',
        reused: 'inline',
        override: applySchemaOverrides,
      }
    );
    attachDefaultSnippets(schema);
    return schema;
  } catch (error) {
    return null;
  }
}

/**
 * yaml-language-server offers a schema's `defaultSnippets` as completions when the author starts a
 * new entry in an array. Attaching them to `fields.items` gives a "pick a field type" menu that
 * scaffolds a complete, valid field (correct `control`/`type`/`metadata`) so authoring does not
 * require recalling keys from the reference docs; `assignees.items` gets the `- uid:` shape. We also
 * surface `$ref` as a completable key on a field entry, since it is a valid alternative to `control`
 * (a field-library reference) but — being conditionless — is otherwise not advertised by the schema.
 */
function attachDefaultSnippets(schema: z.core.JSONSchema.JSONSchema): void {
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
  if (properties == null) {
    return;
  }

  const fieldsItems = properties.fields?.items as Record<string, unknown> | undefined;
  if (fieldsItems != null && typeof fieldsItems === 'object') {
    fieldsItems.defaultSnippets = FIELD_DEFAULT_SNIPPETS;
    const fieldProps = (fieldsItems.properties ?? {}) as Record<string, unknown>;
    fieldProps.$ref = { type: 'string', description: i18n.FIELD_SNIPPET_DESC_REF };
    fieldsItems.properties = fieldProps;
  }

  const assigneesItems = properties.assignees?.items as Record<string, unknown> | undefined;
  if (assigneesItems != null && typeof assigneesItems === 'object') {
    assigneesItems.defaultSnippets = ASSIGNEE_DEFAULT_SNIPPETS;
  }
}

/**
 * Inside allOf items (generated by discriminatedUnion / extend), additionalProperties: false
 * would cause validation to reject properties defined in sibling allOf entries.
 */
function removeAdditionalPropertiesFromAllOfItems(ctx: OverrideCtx) {
  const lastPathPart = ctx.path[ctx.path.length - 1];
  const secondLastPathPart = ctx.path[ctx.path.length - 2];
  if (
    typeof lastPathPart === 'number' &&
    typeof secondLastPathPart === 'string' &&
    secondLastPathPart === 'allOf'
  ) {
    ctx.jsonSchema.additionalProperties = undefined;
  }
}

/**
 * Extracts discriminator values (const, enum, or oneOf/anyOf of consts) from a
 * single property schema.
 */
function extractDiscriminatorValues(propSchema: unknown): string[] {
  if (!propSchema || typeof propSchema !== 'object') {
    return [];
  }

  const schema = propSchema as Record<string, unknown>;

  if ('const' in schema) {
    return [schema.const as string];
  }

  if ('enum' in schema && Array.isArray(schema.enum)) {
    return schema.enum as string[];
  }

  const nestedBranches =
    (schema.oneOf as unknown[] | undefined) ?? (schema.anyOf as unknown[] | undefined);
  if (Array.isArray(nestedBranches)) {
    return nestedBranches
      .filter((nested): nested is { const: string } => {
        return nested != null && typeof nested === 'object' && 'const' in nested;
      })
      .map((nested) => nested.const);
  }

  return [];
}

/**
 * Zod unions (z.union / z.discriminatedUnion) emit oneOf/anyOf in JSON Schema
 * where each branch may carry a const or enum value on a shared property (e.g.
 * `control`). Monaco YAML needs an explicit top-level enum on that property to
 * offer autocomplete suggestions. Only properties that act as true union
 * discriminators are hinted here — each branch must contribute exactly one
 * const value and all branch values must be unique (e.g. `control`, not `type`).
 */
function addDiscriminatorEnumHints(ctx: OverrideCtx) {
  const unionBranches = getUnionBranches(ctx.jsonSchema);
  if (!unionBranches || unionBranches.length === 0) {
    return;
  }

  const propNames = new Set<string>();
  for (const branch of unionBranches) {
    const props = getPropertiesFromBranch(branch);
    if (props) {
      for (const propName of Object.keys(props)) {
        propNames.add(propName);
      }
    }
  }

  for (const propName of propNames) {
    const branchSingleValues: string[] = [];

    for (const branch of unionBranches) {
      const props = getPropertiesFromBranch(branch);
      if (props && propName in props) {
        const values = extractDiscriminatorValues(props[propName]);
        if (values.length !== 1) {
          branchSingleValues.length = 0;
          break;
        }
        branchSingleValues.push(values[0]);
      }
    }

    if (branchSingleValues.length >= 2) {
      const uniqueValues = [...new Set(branchSingleValues)];
      if (uniqueValues.length === branchSingleValues.length) {
        if (!ctx.jsonSchema.properties) {
          ctx.jsonSchema.properties = {};
        }
        ctx.jsonSchema.properties[propName] = {
          type: 'string',
          enum: uniqueValues,
        };
      }
    }
  }
}

/**
 * Adds enum hints on individual union branches when a property is a union of
 * literal values (e.g. INPUT_NUMBER `type`). Keeps branch-specific values out
 * of the top-level properties object so DATE_PICKER only suggests `date`.
 */
function addBranchPropertyEnumHints(ctx: OverrideCtx) {
  const unionBranches = getUnionBranches(ctx.jsonSchema);
  if (!unionBranches || unionBranches.length === 0) {
    return;
  }

  for (const branch of unionBranches) {
    const props = getPropertiesFromBranch(branch);
    if (props) {
      for (const [propName, propSchema] of Object.entries(props)) {
        if (propSchema && typeof propSchema === 'object') {
          const schema = propSchema as Record<string, unknown>;
          const hasLiteralUnion =
            Array.isArray(schema.oneOf) ||
            Array.isArray(schema.anyOf) ||
            (Array.isArray(schema.enum) && (schema.enum as unknown[]).length >= 2);

          if (hasLiteralUnion) {
            const values = extractDiscriminatorValues(propSchema);
            if (values.length >= 2) {
              setPropertyOnBranch(branch, propName, {
                type: 'string',
                enum: [...new Set(values)],
              });
            }
          }
        }
      }
    }
  }
}

/**
 * Adds `uniqueItems: true` to string array schemas for CHECKBOX_GROUP's
 * `options` and `default` properties so Monaco YAML flags duplicate values.
 */
function addUniqueItemsToOptionsArrays(ctx: OverrideCtx) {
  const lastPathPart = ctx.path[ctx.path.length - 1];
  if (
    (lastPathPart === 'options' || lastPathPart === 'default') &&
    ctx.jsonSchema.type === 'array'
  ) {
    const schema = ctx.jsonSchema as Record<string, unknown>;
    schema.uniqueItems = true;
  }
}

/**
 * Sets a human-readable `title` on each oneOf branch that has a `control`
 * discriminator with a const value. Without titles, monaco-yaml's
 * autocomplete shows every field variant as "object".
 */
function addTitlesToOneOfBranches(ctx: OverrideCtx) {
  const unionBranches = getUnionBranches(ctx.jsonSchema);
  if (!unionBranches || unionBranches.length === 0) {
    return;
  }

  for (const branch of unionBranches) {
    const props = getPropertiesFromBranch(branch);
    if (props) {
      const controlProp = props.control;
      if (controlProp && typeof controlProp === 'object' && 'const' in controlProp) {
        const controlValue = (controlProp as { const: string }).const;
        const title = FIELD_TYPE_TITLES[controlValue];
        if (title) {
          branch.title = title;
        }
      }
    }
  }
}

/**
 * Converts the field-level oneOf/anyOf into if/then chains keyed on `control`.
 * This causes monaco-yaml to narrow validation to the matching branch first,
 * producing errors like "type must be long | integer | ..." rather than the
 * confusing "control must be INPUT_TEXT | SELECT_BASIC | ...".
 */
function convertFieldUnionToIfThenChain(ctx: OverrideCtx) {
  const unionBranches = getUnionBranches(ctx.jsonSchema);
  if (!unionBranches || unionBranches.length === 0) {
    return;
  }

  const branchesWithControl: Array<{
    controlValue: string;
    branch: Record<string, unknown>;
  }> = [];

  for (const branch of unionBranches) {
    const props = getPropertiesFromBranch(branch);
    if (props?.control && typeof props.control === 'object' && 'const' in props.control) {
      branchesWithControl.push({
        controlValue: (props.control as { const: string }).const,
        branch,
      });
    }
  }

  if (branchesWithControl.length < 2) {
    return;
  }

  // Only branches carrying a `control` const become if/then entries. The RefField branch (`$ref`,
  // no `control`) contributes none and the original oneOf/anyOf is dropped below, so a `- $ref: foo`
  // entry gets no JSON-Schema validation here. This is intentional: `$ref` completion is served by
  // the dedicated completion provider (use_ref_field_completion), and inline fields still validate.
  const allOf: Array<Record<string, unknown>> = branchesWithControl.map(
    ({ controlValue, branch }) => ({
      if: { properties: { control: { const: controlValue } }, required: ['control'] },
      then: branch,
    })
  );

  const schema = ctx.jsonSchema as Record<string, unknown>;
  schema.allOf = allOf;
  delete schema.oneOf;
  delete schema.anyOf;
}

/**
 * Zod v4 emits `anyOf` for `z.union`, while discriminatedUnion may emit `oneOf`.
 * This helper normalises both to a single branch array.
 */
function getUnionBranches(
  schema: z.core.JSONSchema.BaseSchema
): Array<Record<string, unknown>> | null {
  const candidates =
    (schema.oneOf as Array<Record<string, unknown>> | undefined) ??
    (schema.anyOf as Array<Record<string, unknown>> | undefined);
  return candidates && Array.isArray(candidates) && candidates.length > 0 ? candidates : null;
}

function getPropertiesFromBranch(branch: Record<string, unknown>): Record<string, unknown> | null {
  if (branch.properties) return branch.properties as Record<string, unknown>;

  if (branch.allOf && Array.isArray(branch.allOf)) {
    const merged: Record<string, unknown> = {};
    for (const entry of branch.allOf as Array<Record<string, unknown>>) {
      if (entry.properties) {
        Object.assign(merged, entry.properties);
      }
    }
    return Object.keys(merged).length > 0 ? merged : null;
  }

  return null;
}

function setPropertyOnBranch(
  branch: Record<string, unknown>,
  propName: string,
  propSchema: Record<string, unknown>
): void {
  if (branch.properties && typeof branch.properties === 'object') {
    (branch.properties as Record<string, unknown>)[propName] = propSchema;
    return;
  }

  if (branch.allOf && Array.isArray(branch.allOf)) {
    for (const entry of branch.allOf as Array<Record<string, unknown>>) {
      if (
        entry.properties &&
        typeof entry.properties === 'object' &&
        propName in (entry.properties as Record<string, unknown>)
      ) {
        (entry.properties as Record<string, unknown>)[propName] = propSchema;
        return;
      }
    }
  }
}
