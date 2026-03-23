/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// NOTE: This file uses Zod v4's native z.toJSONSchema() for JSON Schema conversion.
// The fixup pipeline enforces strict additionalProperties and enhances the schema
// with editor-friendly metadata (titles, snippets, etc.) for Monaco YAML.
import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import { ACTION_METADATA_MAP } from '../actions/action_metadata';
import type { StreamType } from '../../types/streamlang';
import { conditionSchema as conditionZodSchema } from '../../types/conditions';

/**
 * JSON Schema produced by Zod v4's native `z.toJSONSchema()`. The output is a
 * flat JSON Schema object (no `definitions` wrapper). We use a loose record
 * type here since the downstream fixup pipeline accesses fields dynamically.
 */
type StreamlangJsonSchema = Record<string, unknown>;

/** Mutable JSON Schema fragment for schema manipulation (object or array) */
type JsonSchemaFragment = Record<string, unknown> | unknown[];

/**
 * Convert the Streamlang Zod schema into JSON Schema and run our fixup pipeline
 * so the result is consumable by Monaco YAML and other validation tooling.
 *
 * Uses Zod v4's native `z.toJSONSchema()` for the conversion. The fixup
 * pipeline enforces strict `additionalProperties` and enhances the schema
 * with editor-friendly metadata (titles, snippets, etc.).
 *
 * @param streamlangSchema - The Zod schema to convert
 * @param streamType - Optional stream type to filter available actions (e.g., exclude manual_ingest_pipeline for wired streams)
 */
export function getJsonSchemaFromStreamlangSchema(
  streamlangSchema: z.ZodType,
  streamType?: StreamType
): StreamlangJsonSchema {
  // Generate the JSON schema using Zod v4's native conversion
  const jsonSchema = z.toJSONSchema(streamlangSchema, {
    target: 'draft-7',
    unrepresentable: 'any',
  });

  // Apply targeted fixes to make it valid for JSON Schema validators
  return fixBrokenSchemaReferencesAndEnforceStrictValidation(jsonSchema, streamType);
}

/**
 * Inline top-level `$ref` pointers so Monaco YAML can traverse the full schema
 * tree without needing to resolve references.
 *
 * Zod v4's `z.toJSONSchema()` emits `$ref` for recursive/shared schemas (e.g.
 * `steps.items` and condition `where` clauses). The old `zodToJsonSchema` library
 * inlined these, allowing Monaco to show hover documentation and autocomplete by
 * walking the schema tree directly. We replicate that by deep-cloning the
 * referenced definitions into the referencing locations.
 *
 * Only non-recursive references are inlined (we skip refs that would create
 * infinite expansion by tracking the ref chain).
 */
/**
 * Inline the `steps.items` `$ref` so Monaco YAML can traverse the processor
 * schemas directly for hover documentation and autocomplete.
 *
 * Zod v4's `z.toJSONSchema()` emits `$ref` for reused schemas, while the old
 * `zodToJsonSchema` library inlined them. Monaco YAML needs inline schemas to
 * show hover documentation — it cannot resolve `$ref` for that purpose.
 *
 * We only inline the `steps.items` pointer (one level). Deeper `$ref`s (e.g.
 * recursive condition schemas) are kept as-is since they were always references
 * and inlining them would explode the schema size.
 */
function inlineStepsItemsRef(schema: StreamlangJsonSchema): void {
  const schemaProps = (schema as Record<string, unknown>).properties as
    | Record<string, unknown>
    | undefined;
  const steps = schemaProps?.steps as Record<string, unknown> | undefined;
  const stepsItems = steps?.items as (Record<string, unknown> & { $ref?: string }) | undefined;
  if (!stepsItems || typeof stepsItems.$ref !== 'string') {
    return;
  }

  const resolved = resolveJsonPointer(schema, stepsItems.$ref);
  if (!resolved) {
    return;
  }

  if (steps) {
    steps.items = JSON.parse(JSON.stringify(resolved));
  }
}

/**
 * Recursively fix additionalProperties in the schema object
 * This ensures all object schemas have additionalProperties: false for strict validation
 */

function fixAdditionalPropertiesInSchema(
  obj: JsonSchemaFragment,
  path: string = '',
  visited = new Set<object>()
): void {
  // Prevent infinite recursion with circular references
  if (typeof obj !== 'object' || obj === null || visited.has(obj)) {
    return;
  }
  visited.add(obj);

  if (Array.isArray(obj)) {
    // Recurse into each array element. Arrays are treated as containers, so we
    // build up a dotted path with `[index]` notation purely for debugging
    // clarity.
    obj.forEach((item, index) =>
      fixAdditionalPropertiesInSchema(item as JsonSchemaFragment, `${path}[${index}]`, visited)
    );
    return;
  }

  const objRecord = obj as Record<string, unknown>;

  // For objects with type: "object", which don't have additionalProperties, set it to false
  if (objRecord.type === 'object' && !('additionalProperties' in objRecord)) {
    objRecord.additionalProperties = false;
  }

  // Remove additionalProperties: false from objects inside allOf arrays
  // In allOf, each schema should be permissive to allow the union of all properties
  if (objRecord.type === 'object' && objRecord.additionalProperties === false) {
    // Check if this object is nested inside an allOf clause.
    // The original logic split the path by '.' and checked for 'allOf' followed by a numeric segment.
    // Since array indices use bracket notation (e.g. "allOf[0]"), this check only triggers when
    // the path contains a literal ".allOf." segment followed by a numeric-only segment — which
    // doesn't happen with our current path format, so this is effectively a no-op that preserves
    // backward compatibility.
    const pathParts = path.split('.');
    const isInAllOf = pathParts.some(
      (part, index) =>
        part === 'allOf' && pathParts[index + 1] && /^\d+$/.test(pathParts[index + 1])
    );

    if (isInAllOf) {
      delete objRecord.additionalProperties;
    }
  }

  // Remove additionalProperties: false from broken reference fallback objects
  if (
    objRecord.type === 'object' &&
    objRecord.additionalProperties === false &&
    objRecord.properties &&
    Object.keys(objRecord.properties as object).length === 0 &&
    typeof objRecord.description === 'string' &&
    objRecord.description.includes('simplified')
  ) {
    // These dummy objects are synthetic placeholders we inject later whenever a
    // `$ref` cannot be resolved. They must remain permissive to avoid blocking
    // users from providing the real configuration.
    delete objRecord.additionalProperties;
  }

  // Recursively process all properties
  Object.keys(objRecord).forEach((key) => {
    fixAdditionalPropertiesInSchema(
      objRecord[key] as JsonSchemaFragment,
      path ? `${path}.${key}` : key,
      visited
    );
  });
}

function fixBrokenSchemaReferencesAndEnforceStrictValidation(
  schema: StreamlangJsonSchema,
  streamType?: StreamType
): StreamlangJsonSchema {
  const schemaString = JSON.stringify(schema);
  let fixedSchemaString = schemaString;

  // Fix 1: Remove duplicate enum values
  // Deduplicates enum entries that can occur when multiple refinements point at the
  // same literal. Validators dislike duplicate entries, so we dedupe while preserving order.
  fixedSchemaString = fixedSchemaString.replace(/"enum":\s*\[([^\]]+)\]/g, (match, enumValues) => {
    try {
      const values = JSON.parse(`[${enumValues}]`);
      const uniqueValues = [...new Set(values)];
      return `"enum":${JSON.stringify(uniqueValues)}`;
    } catch (e) {
      return match;
    }
  });

  // Enforce strict validation: ensure all objects have additionalProperties: false
  try {
    const fixedSchema = JSON.parse(fixedSchemaString) as Record<string, unknown>;
    fixAdditionalPropertiesInSchema(fixedSchema);
    simplifyAnyOfTypeUnions(fixedSchema);
    enhanceStreamlangSchemaForEditor(fixedSchema, streamType);
    inlineStepsItemsRef(fixedSchema);
    return fixedSchema;
  } catch (parseError) {
    throw new Error('Failed to fix additionalProperties in json schema');
  }
}

/**
 * Enhance the generated schema with additional metadata that helps schema-driven
 * tooling (e.g. Monaco YAML) distinguish between the different types of Streamlang
 * steps. At the schema level, action steps are represented as a union (anyOf) of
 * different action types, while where blocks have a 'condition' property. We add
 * helpful metadata like titles and aggregated enums to improve the editor experience.
 *
 * @param streamType - Optional stream type to filter available actions
 */

function enhanceStreamlangSchemaForEditor(
  schema: StreamlangJsonSchema,
  streamType?: StreamType
): void {
  // Zod v4's toJSONSchema produces a flat schema. The steps items may be a
  // $ref pointer (for recursive schemas) rather than an inline definition,
  // so we resolve it before processing.
  const schemaProps = schema?.properties as Record<string, unknown> | undefined;
  const steps = schemaProps?.steps as Record<string, unknown> | undefined;
  let stepsItems = steps?.items as Record<string, unknown> | undefined;

  if (stepsItems?.$ref && typeof stepsItems.$ref === 'string') {
    stepsItems = resolveJsonPointer(schema, stepsItems.$ref) as Record<string, unknown>;
  }

  if (!stepsItems || typeof stepsItems !== 'object') {
    // The steps array schema is missing or malformed; nothing to enhance.
    return;
  }

  const stepOptions = stepsItems.anyOf as unknown[] | undefined;

  if (!Array.isArray(stepOptions) || stepOptions.length < 2) {
    // We expect at least two entries: one for where blocks and another for
    // processor steps. Without both we cannot provide meaningful metadata.
    return;
  }

  // Find action steps (union with anyOf, not a condition block) and condition blocks (have 'condition' property)
  // Action steps are represented as a union (anyOf) of different action schemas
  // Condition blocks have a 'condition' property at the top level
  const actionUnionSchema = stepOptions.find((option: unknown) => {
    const opt = option as Record<string, unknown>;
    const props = opt?.properties as Record<string, unknown> | undefined;
    return opt && typeof opt === 'object' && Array.isArray(opt.anyOf) && !props?.condition;
  }) as Record<string, unknown> | undefined;

  const conditionBlockSchema = stepOptions.find((option: unknown) => {
    const opt = option as Record<string, unknown>;
    const props = opt?.properties as Record<string, unknown> | undefined;
    return opt && typeof opt === 'object' && props?.condition;
  }) as Record<string, unknown> | undefined;

  if (!actionUnionSchema || !conditionBlockSchema) {
    return;
  }

  // Enhance action steps with metadata and aggregated action enum
  if (Array.isArray(actionUnionSchema.anyOf)) {
    enhanceActionSchema(actionUnionSchema, streamType);
  }

  // Enhance condition blocks with metadata and flattened condition property
  enhanceConditionBlockSchema(schema, conditionBlockSchema);
}

/**
 * Add metadata and aggregated action enum to action step schema.
 * Filters out actions based on stream type (e.g., manual_ingest_pipeline for wired streams).
 *
 * @param streamType - Optional stream type to filter available actions
 */
function enhanceActionSchema(
  actionUnionSchema: Record<string, unknown>,
  streamType?: StreamType
): void {
  // Supply human-friendly metadata and a shared action enum across all
  // processor variants to help editors surface better suggestions.
  if (!actionUnionSchema.title) {
    actionUnionSchema.title = 'Action step';
  }

  ensureRequiredProperty(actionUnionSchema, 'action');
  ensureObjectType(actionUnionSchema);

  // Filter out manual_ingest_pipeline for wired streams
  if (streamType === 'wired') {
    const anyOf = actionUnionSchema.anyOf as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(anyOf)) {
      actionUnionSchema.anyOf = anyOf.filter((option) => {
        const actionConst = (option?.properties as Record<string, unknown>)?.action as
          | { const?: string }
          | undefined;
        return actionConst?.const !== 'manual_ingest_pipeline';
      });
    }
  }

  const aggregatedActionProperties: Record<string, unknown> =
    actionUnionSchema.properties && typeof actionUnionSchema.properties === 'object'
      ? { ...(actionUnionSchema.properties as Record<string, unknown>) }
      : {};

  const anyOfOptions = actionUnionSchema.anyOf as Array<Record<string, unknown>> | undefined;
  const actionEnumValues = Array.from(
    new Set(
      (anyOfOptions ?? [])
        .map((option) => {
          const actionConst = (option?.properties as Record<string, unknown>)?.action as
            | { const?: string }
            | undefined;
          return actionConst?.const;
        })
        .filter((value): value is string => typeof value === 'string')
    )
  );

  (anyOfOptions ?? []).forEach((option: Record<string, unknown>) => {
    const optionProps = option?.properties as Record<string, unknown> | undefined;
    const actionConst = optionProps?.action as { const?: string } | undefined;
    const actionName = actionConst?.const;
    if (!actionName) {
      return;
    }
    // Check if actionName is a known processor type
    const metadata =
      actionName in ACTION_METADATA_MAP
        ? ACTION_METADATA_MAP[actionName as keyof typeof ACTION_METADATA_MAP]
        : undefined;
    option.title = metadata?.name ?? actionName;
    if (metadata?.description) {
      option.description = metadata.description;
    }
  });

  aggregatedActionProperties.action = {
    type: 'string',
    ...(actionEnumValues.length > 0 ? { enum: actionEnumValues } : {}),
    description: 'Processor action identifier.',
  };

  actionUnionSchema.properties = aggregatedActionProperties;
}

/**
 * Add metadata and flatten condition property for condition block schema.
 */
function enhanceConditionBlockSchema(
  rootSchema: StreamlangJsonSchema,
  conditionBlockSchema: Record<string, unknown>
): void {
  if (!conditionBlockSchema.title) {
    conditionBlockSchema.title = i18n.translate(
      'xpack.streams.streamlangSchema.conditionBlock.title',
      {
        defaultMessage: 'Condition block',
      }
    );
  }

  ensureRequiredProperty(conditionBlockSchema, 'condition');
  ensureObjectType(conditionBlockSchema);

  // Add defaultSnippets for better autocomplete experience
  // Provide multiple snippet options for common condition patterns
  conditionBlockSchema.defaultSnippets = [
    {
      label: i18n.translate('xpack.streams.streamlangSchema.snippets.conditionBlock.label', {
        defaultMessage: 'Condition block',
      }),
      description: i18n.translate(
        'xpack.streams.streamlangSchema.snippets.conditionBlock.description',
        {
          defaultMessage: 'Conditional step execution with field equals condition',
        }
      ),
      body: {
        condition: {
          field: '${1:field.name}',
          eq: '${2:value}',
          steps: ['${3}'],
        },
      },
    },
    {
      label: i18n.translate('xpack.streams.streamlangSchema.snippets.conditionBlockAnd.label', {
        defaultMessage: 'Condition block (AND)',
      }),
      description: i18n.translate(
        'xpack.streams.streamlangSchema.snippets.conditionBlockAnd.description',
        {
          defaultMessage: 'Execute steps if all conditions are true',
        }
      ),
      body: {
        condition: {
          and: [
            {
              field: '${1:field1.name}',
              eq: '${2:value1}',
            },
            {
              field: '${3:field2.name}',
              eq: '${4:value2}',
            },
          ],
          steps: ['${5}'],
        },
      },
    },
    {
      label: i18n.translate('xpack.streams.streamlangSchema.snippets.conditionBlockOr.label', {
        defaultMessage: 'Condition block (OR)',
      }),
      description: i18n.translate(
        'xpack.streams.streamlangSchema.snippets.conditionBlockOr.description',
        {
          defaultMessage: 'Execute steps if any condition is true',
        }
      ),
      body: {
        condition: {
          or: [
            {
              field: '${1:field1.name}',
              eq: '${2:value1}',
            },
            {
              field: '${3:field2.name}',
              eq: '${4:value2}',
            },
          ],
          steps: ['${5}'],
        },
      },
    },
  ];

  // Flatten the condition allOf intersection for Monaco's benefit
  // This makes the `steps` property directly visible in autocomplete
  enhanceConditionPropertyForEditor(rootSchema, conditionBlockSchema);
}

/**
 * Helper to ensure a property is in the required array.
 */
function ensureRequiredProperty(schema: Record<string, unknown>, propertyName: string): void {
  const required = Array.isArray(schema.required)
    ? new Set<string>(schema.required)
    : new Set<string>();
  required.add(propertyName);
  schema.required = Array.from(required);
}

/**
 * Helper to ensure schema has type: 'object'.
 */
function ensureObjectType(schema: Record<string, unknown>): void {
  if (!schema.type) {
    schema.type = 'object';
  }
}

/**
 * Flatten the condition property's allOf intersection (condition ref + steps) into
 * a single schema that Monaco can easily understand and provide good autocomplete for.
 */
function enhanceConditionPropertyForEditor(
  rootSchema: StreamlangJsonSchema,
  whereBlockOption: Record<string, unknown>
): void {
  const properties = whereBlockOption?.properties as Record<string, unknown> | undefined;
  const conditionProperty = properties?.condition as Record<string, unknown> | undefined;

  // Validate the condition property has the expected allOf structure
  if (!isAllOfIntersection(conditionProperty)) {
    return;
  }

  const allOf = conditionProperty.allOf as unknown[];
  const [conditionRefCandidate, stepsSchemaCandidate] = allOf;

  // Extract and validate the condition reference
  const conditionRef = extractConditionRef(conditionRefCandidate);
  if (!conditionRef) {
    return;
  }

  // Extract and validate the steps schema
  const stepsInfo = extractStepsInfo(stepsSchemaCandidate);
  if (!stepsInfo) {
    return;
  }

  // Resolve the condition schema from the reference
  const conditionSchema = resolveJsonPointer(rootSchema, conditionRef) as
    | Record<string, unknown>
    | undefined;
  if (!conditionSchema) {
    return;
  }

  // Clone and augment the condition schema with the steps property
  const augmentedConditionSchema = cloneAndAddStepsToCondition(
    conditionSchema,
    stepsInfo.stepsPropertySchema,
    stepsInfo.shouldRequireSteps
  );

  if (!augmentedConditionSchema) {
    return;
  }

  // Replace the allOf intersection with a flattened union/object
  const conditionProp = conditionProperty as Record<string, unknown>;
  flattenIntersectionToUnion(conditionProp, augmentedConditionSchema);

  // Add steps property to the flattened schema
  const conditionProps = conditionProp.properties as Record<string, unknown> | undefined;
  conditionProp.type = 'object';
  conditionProp.properties = {
    ...(conditionProps ?? {}),
    steps: stepsInfo.stepsPropertySchema,
  };

  if (stepsInfo.shouldRequireSteps) {
    ensureRequiredProperty(conditionProp, 'steps');
  }

  // Remove the original allOf intersection now that we've flattened it
  delete (conditionProp as { allOf?: unknown[] }).allOf;
}

/**
 * Check if a property is an allOf intersection with at least 2 elements.
 */
function isAllOfIntersection(property: unknown): property is { allOf: unknown[] } {
  const p = property as Record<string, unknown> | null | undefined;
  return p != null && typeof p === 'object' && Array.isArray(p.allOf) && p.allOf.length >= 2;
}

/**
 * Extract the condition reference from an allOf element.
 */
function extractConditionRef(candidate: unknown): string | undefined {
  if (!candidate || typeof candidate !== 'object') {
    return undefined;
  }
  const ref = (candidate as Record<string, unknown>).$ref;
  return typeof ref === 'string' ? ref : undefined;
}

/**
 * Extract steps property schema and required flag from an allOf element.
 */
function extractStepsInfo(
  candidate: unknown
): { stepsPropertySchema: Record<string, unknown>; shouldRequireSteps: boolean } | undefined {
  const cand = candidate as Record<string, unknown>;
  const candProps = cand?.properties as Record<string, unknown> | undefined;
  if (!candidate || typeof candidate !== 'object' || !candProps?.steps) {
    return undefined;
  }

  const required = cand.required;
  const stepsSchema = candProps.steps;
  return {
    stepsPropertySchema: stepsSchema as Record<string, unknown>,
    shouldRequireSteps: Array.isArray(required) && (required as string[]).includes('steps'),
  };
}

/**
 * Replace an allOf intersection with a flattened union structure.
 */
function flattenIntersectionToUnion(
  targetProperty: Record<string, unknown>,
  augmentedSchema: Record<string, unknown>
): void {
  if (Array.isArray(augmentedSchema.anyOf)) {
    targetProperty.anyOf = augmentedSchema.anyOf;
  } else if (Array.isArray(augmentedSchema.oneOf)) {
    targetProperty.oneOf = augmentedSchema.oneOf;
  } else {
    targetProperty.anyOf = [augmentedSchema];
  }
}

function resolveJsonPointer(root: unknown, pointer: string): unknown {
  if (!pointer.startsWith('#/')) {
    return undefined;
  }

  const parts = pointer
    .slice(2)
    .split('/')
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));

  let current: unknown = root;
  for (const part of parts) {
    if (current === undefined || current === null || typeof current !== 'object') {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Clone the condition schema and add the `steps` property to every variant.
 * Conditions can be composed via anyOf/oneOf/allOf, so we need to recursively
 * add `steps` to each branch for Monaco to show proper autocomplete.
 */
function cloneAndAddStepsToCondition(
  conditionSchema: Record<string, unknown>,
  stepsPropertySchema: Record<string, unknown>,
  shouldRequireSteps: boolean
): Record<string, unknown> | undefined {
  if (!conditionSchema || typeof conditionSchema !== 'object') {
    return undefined;
  }

  const clonedSchema = deepClone(conditionSchema);
  const enhanced = recursivelyAddStepsProperty(
    clonedSchema,
    stepsPropertySchema,
    shouldRequireSteps
  );

  // Add defaultSnippets for filter condition operators to help Monaco suggest them
  addFilterConditionSnippets(enhanced);

  return enhanced;
}

/**
 * Add defaultSnippets and titles to filter condition variants to improve autocomplete.
 * This helps Monaco suggest eq, neq, lt, gte, etc. inside condition blocks with clear labels.
 */
function addFilterConditionSnippets(conditionSchema: Record<string, unknown>): void {
  if (!conditionSchema || typeof conditionSchema !== 'object') {
    return;
  }

  // Find and enhance filter condition variants in anyOf/oneOf arrays
  const unionType = getUnionType(conditionSchema);
  if (unionType && Array.isArray(conditionSchema[unionType])) {
    (conditionSchema[unionType] as Array<Record<string, unknown>>).forEach((variant) => {
      const variantProps = variant?.properties as Record<string, unknown> | undefined;
      // Check if this variant looks like a filter condition (has 'field' property)
      if (variantProps?.field && !variantProps?.and && !variantProps?.or) {
        variant.title = i18n.translate('xpack.streams.streamlangSchema.filterCondition.title', {
          defaultMessage: 'Filter condition',
        });
        variant.description = i18n.translate(
          'xpack.streams.streamlangSchema.filterCondition.description',
          {
            defaultMessage: 'Compare a field value using operators like eq, neq, lt, gt, contains',
          }
        );
        addOperatorSnippetsToFilterCondition(variant);
      }
      // Add titles and snippets for logical operators (and, or, not)
      if (variantProps?.and) {
        variant.title = i18n.translate('xpack.streams.streamlangSchema.andCondition.title', {
          defaultMessage: 'AND condition',
        });
        variant.description = i18n.translate(
          'xpack.streams.streamlangSchema.andCondition.description',
          {
            defaultMessage: 'All conditions must be true',
          }
        );
        addLogicalOperatorSnippet(variant, 'and');
      }
      if (variantProps?.or) {
        variant.title = i18n.translate('xpack.streams.streamlangSchema.orCondition.title', {
          defaultMessage: 'OR condition',
        });
        variant.description = i18n.translate(
          'xpack.streams.streamlangSchema.orCondition.description',
          {
            defaultMessage: 'At least one condition must be true',
          }
        );
        addLogicalOperatorSnippet(variant, 'or');
      }
      if (variantProps?.not) {
        variant.title = i18n.translate('xpack.streams.streamlangSchema.notCondition.title', {
          defaultMessage: 'NOT condition',
        });
        variant.description = i18n.translate(
          'xpack.streams.streamlangSchema.notCondition.description',
          {
            defaultMessage: 'Negate a condition',
          }
        );
        addNotOperatorSnippet(variant);
      }
      // Also recurse into nested unions
      addFilterConditionSnippets(variant);
    });
  }
}

/**
 * Add snippet for logical AND/OR operator schema variant.
 */
function addLogicalOperatorSnippet(schema: Record<string, unknown>, operator: 'and' | 'or'): void {
  if (!schema || schema.defaultSnippets) {
    return;
  }

  const label =
    operator === 'and'
      ? i18n.translate('xpack.streams.streamlangSchema.snippets.andCondition.label', {
          defaultMessage: 'AND condition',
        })
      : i18n.translate('xpack.streams.streamlangSchema.snippets.orCondition.label', {
          defaultMessage: 'OR condition',
        });

  const description =
    operator === 'and'
      ? i18n.translate('xpack.streams.streamlangSchema.snippets.andCondition.description', {
          defaultMessage: 'Combine conditions with AND logic',
        })
      : i18n.translate('xpack.streams.streamlangSchema.snippets.orCondition.description', {
          defaultMessage: 'Combine conditions with OR logic',
        });

  schema.defaultSnippets = [
    {
      label,
      description,
      body: {
        [operator]: [
          {
            field: '${1:field1.name}',
            eq: '${2:value1}',
          },
          {
            field: '${3:field2.name}',
            eq: '${4:value2}',
          },
        ],
      },
    },
  ];
}

/**
 * Add snippet for logical NOT operator schema variant.
 */
function addNotOperatorSnippet(schema: Record<string, unknown>): void {
  if (!schema || schema.defaultSnippets) {
    return;
  }

  schema.defaultSnippets = [
    {
      label: i18n.translate('xpack.streams.streamlangSchema.snippets.notCondition.label', {
        defaultMessage: 'NOT condition',
      }),
      description: i18n.translate(
        'xpack.streams.streamlangSchema.snippets.notCondition.description',
        {
          defaultMessage: 'Negate a condition',
        }
      ),
      body: {
        not: {
          field: '${1:field.name}',
          eq: '${2:value}',
        },
      },
    },
  ];
}

/**
 * Add operator defaultSnippets to a filter condition schema variant.
 */
function addOperatorSnippetsToFilterCondition(
  filterConditionSchema: Record<string, unknown>
): void {
  if (!filterConditionSchema || filterConditionSchema.defaultSnippets) {
    return;
  }

  filterConditionSchema.defaultSnippets = [
    {
      label: i18n.translate('xpack.streams.streamlangSchema.snippets.fieldEquals.label', {
        defaultMessage: 'Field equals',
      }),
      description: i18n.translate(
        'xpack.streams.streamlangSchema.snippets.fieldEquals.description',
        {
          defaultMessage: 'Check if field equals a value',
        }
      ),
      body: {
        field: '${1:field.name}',
        eq: '${2:value}',
      },
    },
    {
      label: i18n.translate('xpack.streams.streamlangSchema.snippets.fieldNotEquals.label', {
        defaultMessage: 'Field not equals',
      }),
      description: i18n.translate(
        'xpack.streams.streamlangSchema.snippets.fieldNotEquals.description',
        {
          defaultMessage: 'Check if field does not equal a value',
        }
      ),
      body: {
        field: '${1:field.name}',
        neq: '${2:value}',
      },
    },
    {
      label: i18n.translate('xpack.streams.streamlangSchema.snippets.fieldLessThan.label', {
        defaultMessage: 'Field less than',
      }),
      description: i18n.translate(
        'xpack.streams.streamlangSchema.snippets.fieldLessThan.description',
        {
          defaultMessage: 'Check if field is less than a value',
        }
      ),
      body: {
        field: '${1:field.name}',
        lt: '${2:value}',
      },
    },
    {
      label: i18n.translate('xpack.streams.streamlangSchema.snippets.fieldLessThanOrEqual.label', {
        defaultMessage: 'Field less than or equal',
      }),
      description: i18n.translate(
        'xpack.streams.streamlangSchema.snippets.fieldLessThanOrEqual.description',
        {
          defaultMessage: 'Check if field is less than or equal to a value',
        }
      ),
      body: {
        field: '${1:field.name}',
        lte: '${2:value}',
      },
    },
    {
      label: i18n.translate('xpack.streams.streamlangSchema.snippets.fieldGreaterThan.label', {
        defaultMessage: 'Field greater than',
      }),
      description: i18n.translate(
        'xpack.streams.streamlangSchema.snippets.fieldGreaterThan.description',
        {
          defaultMessage: 'Check if field is greater than a value',
        }
      ),
      body: {
        field: '${1:field.name}',
        gt: '${2:value}',
      },
    },
    {
      label: i18n.translate(
        'xpack.streams.streamlangSchema.snippets.fieldGreaterThanOrEqual.label',
        {
          defaultMessage: 'Field greater than or equal',
        }
      ),
      description: i18n.translate(
        'xpack.streams.streamlangSchema.snippets.fieldGreaterThanOrEqual.description',
        {
          defaultMessage: 'Check if field is greater than or equal to a value',
        }
      ),
      body: {
        field: '${1:field.name}',
        gte: '${2:value}',
      },
    },
    {
      label: i18n.translate('xpack.streams.streamlangSchema.snippets.fieldContains.label', {
        defaultMessage: 'Field contains',
      }),
      description: i18n.translate(
        'xpack.streams.streamlangSchema.snippets.fieldContains.description',
        {
          defaultMessage: 'Check if field contains a value',
        }
      ),
      body: {
        field: '${1:field.name}',
        contains: '${2:value}',
      },
    },
    {
      label: i18n.translate('xpack.streams.streamlangSchema.snippets.fieldStartsWith.label', {
        defaultMessage: 'Field starts with',
      }),
      description: i18n.translate(
        'xpack.streams.streamlangSchema.snippets.fieldStartsWith.description',
        {
          defaultMessage: 'Check if field starts with a value',
        }
      ),
      body: {
        field: '${1:field.name}',
        startsWith: '${2:value}',
      },
    },
    {
      label: i18n.translate('xpack.streams.streamlangSchema.snippets.fieldEndsWith.label', {
        defaultMessage: 'Field ends with',
      }),
      description: i18n.translate(
        'xpack.streams.streamlangSchema.snippets.fieldEndsWith.description',
        {
          defaultMessage: 'Check if field ends with a value',
        }
      ),
      body: {
        field: '${1:field.name}',
        endsWith: '${2:value}',
      },
    },
    {
      label: i18n.translate('xpack.streams.streamlangSchema.snippets.fieldExists.label', {
        defaultMessage: 'Field exists',
      }),
      description: i18n.translate(
        'xpack.streams.streamlangSchema.snippets.fieldExists.description',
        {
          defaultMessage: 'Check if field exists',
        }
      ),
      body: {
        field: '${1:field.name}',
        exists: true,
      },
    },
    {
      label: i18n.translate('xpack.streams.streamlangSchema.snippets.fieldRange.label', {
        defaultMessage: 'Field range',
      }),
      description: i18n.translate(
        'xpack.streams.streamlangSchema.snippets.fieldRange.description',
        {
          defaultMessage: 'Check if field is within a range',
        }
      ),
      body: {
        field: '${1:field.name}',
        range: {
          gte: '${2:minValue}',
          lte: '${3:maxValue}',
        },
      },
    },
  ];
}

/**
 * Recursively add the `steps` property to every object variant in the condition schema.
 */
function recursivelyAddStepsProperty(
  node: Record<string, unknown>,
  stepsPropertySchema: Record<string, unknown>,
  shouldRequireSteps: boolean
): Record<string, unknown> {
  if (!node || typeof node !== 'object') {
    return node;
  }

  // Recursively process union/intersection schemas
  const unionType = getUnionType(node);
  if (unionType) {
    const options = node[unionType] as Array<Record<string, unknown>> | undefined;
    return {
      ...node,
      [unionType]: (options ?? []).map((option) =>
        recursivelyAddStepsProperty(option, stepsPropertySchema, shouldRequireSteps)
      ),
    };
  }

  // Only add steps to object-shaped schemas
  if (!isObjectSchema(node)) {
    return node;
  }

  // Add the steps property to this object variant
  return addStepsPropertyToObject(node, stepsPropertySchema, shouldRequireSteps);
}

/**
 * Check if a node is a union/intersection and return the type (anyOf, oneOf, or allOf).
 */
function getUnionType(node: Record<string, unknown>): 'anyOf' | 'oneOf' | 'allOf' | undefined {
  if (Array.isArray(node.anyOf)) return 'anyOf';
  if (Array.isArray(node.oneOf)) return 'oneOf';
  if (Array.isArray(node.allOf)) return 'allOf';
  return undefined;
}

/**
 * Check if a node represents an object schema.
 */
function isObjectSchema(node: Record<string, unknown>): boolean {
  return (
    node.type === 'object' ||
    Boolean(node.properties) ||
    Array.isArray(node.required) ||
    node.additionalProperties !== undefined
  );
}

/**
 * Add the steps property to an object schema node.
 */
function addStepsPropertyToObject(
  node: Record<string, unknown>,
  stepsPropertySchema: Record<string, unknown>,
  shouldRequireSteps: boolean
): Record<string, unknown> {
  const nodeProps = node.properties as Record<string, unknown> | undefined;
  const updatedNode: Record<string, unknown> = {
    ...node,
    properties: {
      ...(nodeProps ?? {}),
      steps: stepsPropertySchema,
    },
  };

  if (shouldRequireSteps) {
    ensureRequiredProperty(updatedNode, 'steps');
  }

  ensureObjectType(updatedNode);

  return updatedNode;
}

/**
 * Deep clone utility for schema objects.
 * Uses JSON serialization since schema fragments are plain objects.
 */
function deepClone<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

// ---------------------------------------------------------------------------
// Standalone condition schema for the condition syntax editor
// ---------------------------------------------------------------------------

/**
 * Get Monaco YAML schema configuration for the standalone condition editor.
 *
 * This generates a JSON Schema from the condition Zod schema and applies
 * the same fixups used for the full Streamlang schema (enum dedup,
 * additionalProperties enforcement) plus condition-specific transforms
 * (anyOf flattening, operator snippets).
 *
 * @returns Schema configuration object for monaco-yaml, or null if generation fails
 */
export function getConditionMonacoSchemaConfig(): {
  uri: string;
  fileMatch: string[];
  schema: Record<string, unknown>;
} | null {
  try {
    const jsonSchema = z.toJSONSchema(conditionZodSchema, {
      target: 'draft-7',
      unrepresentable: 'any',
    });

    const schema = fixConditionSchema(jsonSchema);
    return {
      uri: 'http://elastic.co/schemas/condition.json',
      fileMatch: ['*'],
      schema: schema as Record<string, unknown>,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to generate condition JSON schema:', error);
    return null;
  }
}

function fixConditionSchema(schema: StreamlangJsonSchema): StreamlangJsonSchema {
  let schemaString = JSON.stringify(schema);

  // Dedup enum values (same fix as the Streamlang schema pipeline)
  schemaString = schemaString.replace(/"enum":\s*\[([^\]]+)\]/g, (match, enumValues) => {
    try {
      const values = JSON.parse(`[${enumValues}]`);
      const uniqueValues = [...new Set(values)];
      return `"enum":${JSON.stringify(uniqueValues)}`;
    } catch (e) {
      return match;
    }
  });

  const fixedSchema = JSON.parse(schemaString);
  fixAdditionalPropertiesInSchema(fixedSchema);
  flattenConditionOneOf(fixedSchema);
  simplifyAnyOfTypeUnions(fixedSchema);
  return fixedSchema;
}

/**
 * Convert simple `anyOf` type-only unions into the compact `type: [...]` form.
 *
 * Zod v4 emits `anyOf: [{type:"string"},{type:"number"},{type:"boolean"}]`
 * for `z.union([z.string(), z.number(), z.boolean()])`. Monaco YAML renders
 * this as "||" in autocomplete, hiding the property description. The compact
 * form `type: ["string","number","boolean"]` (valid in JSON Schema draft-07)
 * makes Monaco fall back to showing the description instead.
 */
function simplifyAnyOfTypeUnions(obj: JsonSchemaFragment, visited = new Set<object>()): void {
  if (typeof obj !== 'object' || obj === null || visited.has(obj as object)) {
    return;
  }
  visited.add(obj as object);

  if (Array.isArray(obj)) {
    obj.forEach((item) => simplifyAnyOfTypeUnions(item as JsonSchemaFragment, visited));
    return;
  }

  const objRecord = obj as Record<string, unknown>;
  const anyOf = objRecord.anyOf as Array<Record<string, unknown>> | undefined;
  if (
    Array.isArray(anyOf) &&
    anyOf.length > 0 &&
    anyOf.every(
      (entry) =>
        entry &&
        typeof entry === 'object' &&
        typeof entry.type === 'string' &&
        Object.keys(entry).length === 1
    )
  ) {
    objRecord.type = anyOf.map((entry) => entry.type);
    delete objRecord.anyOf;
  }

  for (const key of Object.keys(objRecord)) {
    simplifyAnyOfTypeUnions(objRecord[key] as JsonSchemaFragment, visited);
  }
}

/**
 * Flatten the ConditionSchema's anyOf union into a single object with all
 * properties merged. This prevents monaco-yaml from showing redundant "object"
 * entries in autocomplete — only individual property names appear.
 *
 * Snippets are populated by calling `addFilterConditionSnippets` on the
 * variants before flattening, then collecting their `defaultSnippets`.
 */
function flattenConditionOneOf(schema: StreamlangJsonSchema): void {
  // Zod v4's z.toJSONSchema produces a flat schema: the condition anyOf lives
  // at the root rather than nested inside definitions.ConditionSchema (old format).
  const schemaRecord = schema as Record<string, unknown>;
  const definitions = schemaRecord.definitions as Record<string, unknown> | undefined;
  const defs = definitions ?? (schemaRecord.$defs as Record<string, unknown> | undefined);
  const conditionDef = (schemaRecord.anyOf ? schemaRecord : defs?.ConditionSchema) as
    | Record<string, unknown>
    | undefined;

  if (!conditionDef?.anyOf) {
    return;
  }

  addFilterConditionSnippets(conditionDef as Record<string, unknown>);

  const excludedProperties = new Set(['always', 'never']);
  const mergedProperties: Record<string, unknown> = {};
  const mergedSnippets: unknown[] = [];

  function collect(node: unknown): void {
    if (!node || typeof node !== 'object') return;
    const nodeRecord = node as Record<string, unknown>;
    if (nodeRecord.anyOf) {
      (nodeRecord.anyOf as unknown[]).forEach((v) => collect(v));
      return;
    }
    if (nodeRecord.oneOf) {
      (nodeRecord.oneOf as unknown[]).forEach((v) => collect(v));
      return;
    }
    const nodeProps = nodeRecord.properties as Record<string, unknown> | undefined;
    if (nodeProps) {
      const keys = Object.keys(nodeProps);
      if (keys.length === 1 && excludedProperties.has(keys[0])) {
        return;
      }
      for (const [key, value] of Object.entries(nodeProps)) {
        if (!mergedProperties[key] && !excludedProperties.has(key)) {
          mergedProperties[key] = value;
        }
      }
    }
    const nodeSnippets = nodeRecord.defaultSnippets;
    if (Array.isArray(nodeSnippets)) {
      mergedSnippets.push(...nodeSnippets);
    }
  }

  collect(conditionDef);

  const { description } = conditionDef;
  delete conditionDef.anyOf;
  conditionDef.type = 'object';
  conditionDef.properties = mergedProperties;
  (conditionDef as Record<string, unknown>).additionalProperties = false;
  if (description) {
    conditionDef.description = description;
  }
  if (mergedSnippets.length > 0) {
    conditionDef.defaultSnippets = mergedSnippets;
  }
}
