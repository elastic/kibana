/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// NOTE: Some of the workaround logic in this file (for fixBrokenSchemaReferencesAndEnforceStrictValidation) is similar
// to that found in src/platform/packages/shared/kbn-workflows/spec/lib/get_json_schema_from_yaml_schema.ts
// from Workflows. We may be able to align / share these utilities in the future once both projects aren't
// in flux.
import type { JsonSchema7Type } from 'zod-to-json-schema';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { z } from '@kbn/zod';
import { i18n } from '@kbn/i18n';
import { ACTION_METADATA_MAP } from '../actions/action_metadata';
import type { StreamType } from '../../types/streamlang';

/**
 * JSON Schema scaffold produced from the Streamlang Zod schema. The converter
 * always emits a root `$ref` that points into `definitions.StreamlangSchema`,
 * so we capture that structure here to provide type safety when we later
 * mutate the generated schema tree.
 */
type StreamlangJsonSchema = JsonSchema7Type & {
  $ref: '#/definitions/StreamlangSchema';
  $schema: 'http://json-schema.org/draft-07/schema#';
  definitions: {
    StreamlangSchema: JsonSchema7Type;
  };
};

/**
 * Convert the Streamlang Zod schema into JSON Schema and run our fixup pipeline
 * so the result is consumable by Monaco YAML and other validation tooling.
 *
 * The raw output of `zod-to-json-schema` contains recursive references that
 * Monaco cannot resolve, and it omits strict `additionalProperties` flags.
 * This helper normalises those quirks before returning the schema artifact.
 *
 * @param streamlangSchema - The Zod schema to convert
 * @param streamType - Optional stream type to filter available actions (e.g., exclude manual_ingest_pipeline for wired streams)
 */
export function getJsonSchemaFromStreamlangSchema(
  streamlangSchema: z.ZodType,
  streamType?: StreamType
): StreamlangJsonSchema {
  // Generate the json schema from zod schema
  const jsonSchema = zodToJsonSchema(streamlangSchema, {
    name: 'StreamlangSchema',
    target: 'jsonSchema7',
  });

  // Apply targeted fixes to make it valid for JSON Schema validators
  return fixBrokenSchemaReferencesAndEnforceStrictValidation(jsonSchema, streamType);
}

/**
 * Recursively fix additionalProperties in the schema object
 * This ensures all object schemas have additionalProperties: false for strict validation
 */

function fixAdditionalPropertiesInSchema(obj: any, path: string = '', visited = new Set()): void {
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
      fixAdditionalPropertiesInSchema(item, `${path}[${index}]`, visited)
    );
    return;
  }

  // For objects with type: "object", which don't have additionalProperties, set it to false
  if (obj.type === 'object' && !('additionalProperties' in obj)) {
    obj.additionalProperties = false;
  }

  // Remove additionalProperties: false from objects inside allOf arrays
  // In allOf, each schema should be permissive to allow the union of all properties
  if (obj.type === 'object' && obj.additionalProperties === false) {
    const pathParts = path.split('.');
    const isInAllOf = pathParts.some((part, index) => {
      // If a path segment equals "allOf" and is followed by a numeric index,
      // we know this object is nested inside an intersection clause.
      return part === 'allOf' && pathParts[index + 1] && /^\d+$/.test(pathParts[index + 1]);
    });

    if (isInAllOf) {
      delete obj.additionalProperties;
    }
  }

  // Remove additionalProperties: false from broken reference fallback objects
  if (
    obj.type === 'object' &&
    obj.additionalProperties === false &&
    obj.properties &&
    Object.keys(obj.properties).length === 0 &&
    obj.description &&
    obj.description.includes('simplified')
  ) {
    // These dummy objects are synthetic placeholders we inject later whenever a
    // `$ref` cannot be resolved. They must remain permissive to avoid blocking
    // users from providing the real configuration.
    delete obj.additionalProperties;
  }

  // Recursively process all properties
  Object.keys(obj).forEach((key) => {
    fixAdditionalPropertiesInSchema(obj[key], path ? `${path}.${key}` : key, visited);
  });
}

function fixBrokenSchemaReferencesAndEnforceStrictValidation(
  schema: any,
  streamType?: StreamType
): any {
  const schemaString = JSON.stringify(schema);
  let fixedSchemaString = schemaString;

  // Fix 1: Remove duplicate enum values
  // zod-to-json-schema occasionally emits duplicated enum entries when multiple
  // refinements point at the same literal. Validators dislike this, so we dedupe
  // the list while preserving the original order.
  fixedSchemaString = fixedSchemaString.replace(/"enum":\s*\[([^\]]+)\]/g, (match, enumValues) => {
    try {
      const values = JSON.parse(`[${enumValues}]`);
      const uniqueValues = [...new Set(values)];
      return `"enum":${JSON.stringify(uniqueValues)}`;
    } catch (e) {
      return match;
    }
  });

  // Fix 2: Break deeply nested references that cause infinite loops
  fixedSchemaString = fixedSchemaString.replace(
    /"\$ref":"#\/definitions\/StreamlangSchema\/properties\/steps\/items\/anyOf\/\d+\/properties\/where\/properties\/steps\/items\/anyOf\/\d+\/properties\/where\/properties\/steps"/g,
    '"type": "array", "description": "Nested steps (recursion limited to prevent infinite loops)", "items": {"type": "object", "additionalProperties": false}'
  );

  // Fix 3: Fix bare allOf references
  fixedSchemaString = fixedSchemaString.replace(
    /"\$ref":"#\/definitions\/StreamlangSchema\/properties\/steps\/items\/anyOf\/\d+\/allOf\/\d+\/allOf\/\d+(?:\/allOf\/\d+)*"/g,
    '"type": "object", "properties": {}, "additionalProperties": false, "description": "Complex schema intersection (simplified due to broken allOf reference)"'
  );

  // Fix 4: Fix deeply nested allOf references with properties
  fixedSchemaString = fixedSchemaString.replace(
    /"\$ref":"#\/definitions\/StreamlangSchema\/properties\/steps\/items\/anyOf\/\d+\/allOf\/\d+\/allOf\/\d+\/properties\/[^"]+"/g,
    '"type": "object", "properties": {}, "additionalProperties": false, "description": "Nested configuration (simplified)"'
  );

  // Fix 5: Fix any remaining deeply nested broken references
  fixedSchemaString = fixedSchemaString.replace(
    /"\$ref":"#\/definitions\/[^"]*\/allOf\/\d+\/allOf\/\d+\/allOf\/\d+\/properties\/[^"]+"/g,
    '"type": "object", "properties": {}, "additionalProperties": false, "description": "Complex object (validation simplified)"'
  );

  // Fix 6: Fix any remaining bare allOf references (catch-all)
  fixedSchemaString = fixedSchemaString.replace(
    /"\$ref":"#\/definitions\/[^"]*\/allOf\/\d+\/allOf\/\d+(?:\/allOf\/\d+)*"/g,
    '"type": "object", "properties": {}, "additionalProperties": false, "description": "Schema intersection (simplified due to broken reference)"'
  );

  // Enforce strict validation: ensure all objects have additionalProperties: false
  try {
    // After applying all text replacements we round-trip through JSON to obtain
    // a mutable object graph again before running the recursive post-processors.
    const fixedSchema = JSON.parse(fixedSchemaString);
    fixAdditionalPropertiesInSchema(fixedSchema);
    enhanceStreamlangSchemaForEditor(fixedSchema, streamType);
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

function enhanceStreamlangSchemaForEditor(schema: any, streamType?: StreamType): void {
  const stepsItems = schema?.definitions?.StreamlangSchema?.properties?.steps?.items;

  if (!stepsItems || typeof stepsItems !== 'object') {
    // The steps array schema is missing or malformed; nothing to enhance.
    return;
  }

  const stepOptions = stepsItems.anyOf;

  if (!Array.isArray(stepOptions) || stepOptions.length < 2) {
    // We expect at least two entries: one for where blocks and another for
    // processor steps. Without both we cannot provide meaningful metadata.
    return;
  }

  // Find action steps (union with anyOf, not a condition block) and condition blocks (have 'condition' property)
  // Action steps are represented as a union (anyOf) of different action schemas
  // Condition blocks have a 'condition' property at the top level
  const actionUnionSchema = stepOptions.find(
    (option: unknown) =>
      option &&
      typeof option === 'object' &&
      Array.isArray((option as { anyOf?: unknown[] }).anyOf) &&
      !(option as { properties?: Record<string, unknown> }).properties?.condition
  );

  const conditionBlockSchema = stepOptions.find(
    (option: unknown) =>
      option &&
      typeof option === 'object' &&
      (option as { properties?: Record<string, unknown> }).properties?.condition
  );

  if (!actionUnionSchema || !conditionBlockSchema) {
    return;
  }

  // Enhance action steps with metadata and aggregated action enum
  if (typeof actionUnionSchema === 'object' && Array.isArray(actionUnionSchema.anyOf)) {
    enhanceActionSchema(actionUnionSchema, streamType);
  }

  // Enhance condition blocks with metadata and flattened condition property
  if (typeof conditionBlockSchema === 'object') {
    enhanceConditionBlockSchema(schema, conditionBlockSchema);
  }
}

/**
 * Add metadata and aggregated action enum to action step schema.
 * Filters out actions based on stream type (e.g., manual_ingest_pipeline for wired streams).
 *
 * @param streamType - Optional stream type to filter available actions
 */
function enhanceActionSchema(actionUnionSchema: any, streamType?: StreamType): void {
  // Supply human-friendly metadata and a shared action enum across all
  // processor variants to help editors surface better suggestions.
  if (!actionUnionSchema.title) {
    actionUnionSchema.title = 'Action step';
  }

  ensureRequiredProperty(actionUnionSchema, 'action');
  ensureObjectType(actionUnionSchema);

  // Filter out manual_ingest_pipeline for wired streams
  if (streamType === 'wired') {
    actionUnionSchema.anyOf = actionUnionSchema.anyOf.filter((option: any) => {
      const actionName = option?.properties?.action?.const as string | undefined;
      return actionName !== 'manual_ingest_pipeline';
    });
  }

  const aggregatedActionProperties =
    actionUnionSchema.properties && typeof actionUnionSchema.properties === 'object'
      ? { ...actionUnionSchema.properties }
      : {};

  const actionEnumValues = Array.from(
    new Set(
      actionUnionSchema.anyOf
        .map((option: any) => option?.properties?.action?.const as string | undefined)
        .filter((value: string | undefined): value is string => typeof value === 'string')
    )
  );

  actionUnionSchema.anyOf.forEach((option: any) => {
    const actionName = option?.properties?.action?.const as string | undefined;
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
function enhanceConditionBlockSchema(rootSchema: any, conditionBlockSchema: any): void {
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
function ensureRequiredProperty(schema: any, propertyName: string): void {
  const required = Array.isArray(schema.required)
    ? new Set<string>(schema.required)
    : new Set<string>();
  required.add(propertyName);
  schema.required = Array.from(required);
}

/**
 * Helper to ensure schema has type: 'object'.
 */
function ensureObjectType(schema: any): void {
  if (!schema.type) {
    schema.type = 'object';
  }
}

/**
 * Flatten the condition property's allOf intersection (condition ref + steps) into
 * a single schema that Monaco can easily understand and provide good autocomplete for.
 */
function enhanceConditionPropertyForEditor(rootSchema: any, whereBlockOption: any): void {
  const conditionProperty = whereBlockOption?.properties?.condition;

  // Validate the condition property has the expected allOf structure
  if (!isAllOfIntersection(conditionProperty)) {
    return;
  }

  const [conditionRefCandidate, stepsSchemaCandidate] = conditionProperty.allOf;

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
  const conditionSchema = resolveJsonPointer(rootSchema, conditionRef);
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
  flattenIntersectionToUnion(conditionProperty, augmentedConditionSchema);

  // Add steps property to the flattened schema
  conditionProperty.type = 'object';
  conditionProperty.properties = {
    ...(conditionProperty.properties ?? {}),
    steps: stepsInfo.stepsPropertySchema,
  };

  if (stepsInfo.shouldRequireSteps) {
    ensureRequiredProperty(conditionProperty, 'steps');
  }

  // Remove the original allOf intersection now that we've flattened it
  delete conditionProperty.allOf;
}

/**
 * Check if a property is an allOf intersection with at least 2 elements.
 */
function isAllOfIntersection(property: any): boolean {
  return (
    property &&
    typeof property === 'object' &&
    Array.isArray(property.allOf) &&
    property.allOf.length >= 2
  );
}

/**
 * Extract the condition reference from an allOf element.
 */
function extractConditionRef(candidate: any): string | undefined {
  if (!candidate || typeof candidate !== 'object' || typeof candidate.$ref !== 'string') {
    return undefined;
  }
  return candidate.$ref;
}

/**
 * Extract steps property schema and required flag from an allOf element.
 */
function extractStepsInfo(
  candidate: any
): { stepsPropertySchema: any; shouldRequireSteps: boolean } | undefined {
  if (
    !candidate ||
    typeof candidate !== 'object' ||
    !candidate.properties ||
    !candidate.properties.steps
  ) {
    return undefined;
  }

  return {
    stepsPropertySchema: candidate.properties.steps,
    shouldRequireSteps: Array.isArray(candidate.required) && candidate.required.includes('steps'),
  };
}

/**
 * Replace an allOf intersection with a flattened union structure.
 */
function flattenIntersectionToUnion(targetProperty: any, augmentedSchema: any): void {
  if (Array.isArray(augmentedSchema.anyOf)) {
    targetProperty.anyOf = augmentedSchema.anyOf;
  } else if (Array.isArray(augmentedSchema.oneOf)) {
    targetProperty.oneOf = augmentedSchema.oneOf;
  } else {
    targetProperty.anyOf = [augmentedSchema];
  }
}

function resolveJsonPointer(root: any, pointer: string): any {
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

    current = (current as any)[part];
  }

  return current;
}

/**
 * Clone the condition schema and add the `steps` property to every variant.
 * Conditions can be composed via anyOf/oneOf/allOf, so we need to recursively
 * add `steps` to each branch for Monaco to show proper autocomplete.
 */
function cloneAndAddStepsToCondition(
  conditionSchema: any,
  stepsPropertySchema: any,
  shouldRequireSteps: boolean
): any {
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
function addFilterConditionSnippets(conditionSchema: any): void {
  if (!conditionSchema || typeof conditionSchema !== 'object') {
    return;
  }

  // Find and enhance filter condition variants in anyOf/oneOf arrays
  const unionType = getUnionType(conditionSchema);
  if (unionType && Array.isArray(conditionSchema[unionType])) {
    conditionSchema[unionType].forEach((variant: any) => {
      // Check if this variant looks like a filter condition (has 'field' property)
      if (variant?.properties?.field && !variant?.properties?.and && !variant?.properties?.or) {
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
      if (variant?.properties?.and) {
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
      if (variant?.properties?.or) {
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
      if (variant?.properties?.not) {
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
function addLogicalOperatorSnippet(schema: any, operator: 'and' | 'or'): void {
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
function addNotOperatorSnippet(schema: any): void {
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
function addOperatorSnippetsToFilterCondition(filterConditionSchema: any): void {
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
  node: any,
  stepsPropertySchema: any,
  shouldRequireSteps: boolean
): any {
  if (!node || typeof node !== 'object') {
    return node;
  }

  // Recursively process union/intersection schemas
  const unionType = getUnionType(node);
  if (unionType) {
    return {
      ...node,
      [unionType]: node[unionType].map((option: any) =>
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
function getUnionType(node: any): 'anyOf' | 'oneOf' | 'allOf' | undefined {
  if (Array.isArray(node.anyOf)) return 'anyOf';
  if (Array.isArray(node.oneOf)) return 'oneOf';
  if (Array.isArray(node.allOf)) return 'allOf';
  return undefined;
}

/**
 * Check if a node represents an object schema.
 */
function isObjectSchema(node: any): boolean {
  return (
    node.type === 'object' ||
    node.properties ||
    Array.isArray(node.required) ||
    node.additionalProperties !== undefined
  );
}

/**
 * Add the steps property to an object schema node.
 */
function addStepsPropertyToObject(
  node: any,
  stepsPropertySchema: any,
  shouldRequireSteps: boolean
): any {
  const updatedNode = {
    ...node,
    properties: {
      ...(node.properties ?? {}),
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
function deepClone<T = any>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}
