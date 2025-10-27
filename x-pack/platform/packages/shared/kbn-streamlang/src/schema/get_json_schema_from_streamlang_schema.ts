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
import { ACTION_METADATA_MAP } from '../actions/action_metadata';

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
 */
export function getJsonSchemaFromStreamlangSchema(
  streamlangSchema: z.ZodType
): StreamlangJsonSchema {
  // Generate the json schema from zod schema
  const jsonSchema = zodToJsonSchema(streamlangSchema, {
    name: 'StreamlangSchema',
    target: 'jsonSchema7',
  });

  // Apply targeted fixes to make it valid for JSON Schema validators
  return fixBrokenSchemaReferencesAndEnforceStrictValidation(jsonSchema);
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

function fixBrokenSchemaReferencesAndEnforceStrictValidation(schema: any): any {
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
    enhanceStreamlangSchemaForEditor(fixedSchema);
    return fixedSchema;
  } catch (parseError) {
    throw new Error('Failed to fix additionalProperties in json schema');
  }
}

/**
 * Enhance the generated schema with additional metadata that helps schema-driven
 * tooling (e.g. Monaco YAML) distinguish between the different types of Streamlang
 * steps. This keeps the exhaustive action schemas untouched (to preserve all
 * validation rules) while giving editors easy hints about the primary discriminator
 * fields.
 * All of this ceremony is needed because we don't have a discriminator field in
 * the Streamlang schema itself for our action vs where steps.
 */

function enhanceStreamlangSchemaForEditor(schema: any): void {
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

  const actionIndex = stepOptions.findIndex(
    (option: unknown) =>
      option &&
      typeof option === 'object' &&
      Array.isArray((option as { anyOf?: unknown[] }).anyOf) &&
      !(option as { properties?: Record<string, unknown> }).properties?.where
  );

  const whereIndex = stepOptions.findIndex(
    (option: unknown) =>
      option &&
      typeof option === 'object' &&
      (option as { properties?: Record<string, unknown> }).properties?.where
  );

  if (actionIndex === -1 || whereIndex === -1) {
    return;
  }

  const actionUnionSchema = stepOptions[actionIndex];
  const whereSchema = stepOptions[whereIndex];

  if (
    actionUnionSchema &&
    typeof actionUnionSchema === 'object' &&
    Array.isArray(actionUnionSchema.anyOf)
  ) {
    // Supply human-friendly metadata and a shared action enum across all
    // processor variants to help editors surface better suggestions.
    if (!actionUnionSchema.title) {
      actionUnionSchema.title = 'Action step';
    }
    actionUnionSchema['x-kbn-step-kind'] = 'action';

    const actionRequired = Array.isArray(actionUnionSchema.required)
      ? new Set<string>(actionUnionSchema.required)
      : new Set<string>();
    actionRequired.add('action');
    actionUnionSchema.required = Array.from(actionRequired);

    if (!actionUnionSchema.type) {
      actionUnionSchema.type = 'object';
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
      const metadata = ACTION_METADATA_MAP[actionName];
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

  // The second option is the where block schema (recursive condition with steps)
  if (whereSchema && typeof whereSchema === 'object') {
    // Mirroring the action metadata gives us consistent UX across both union
    // arms (tooltips, palettes, etc.).
    if (!whereSchema.title) {
      whereSchema.title = 'Where block';
    }
    whereSchema['x-kbn-step-kind'] = 'where';

    const whereRequired = Array.isArray(whereSchema.required)
      ? new Set<string>(whereSchema.required)
      : new Set<string>();
    whereRequired.add('where');
    whereSchema.required = Array.from(whereRequired);

    if (!whereSchema.type) {
      whereSchema.type = 'object';
    }

    enhanceWherePropertyWithSteps(schema, whereSchema);
  }
}

function enhanceWherePropertyWithSteps(rootSchema: any, whereBlockOption: any): void {
  const whereProperty = whereBlockOption?.properties?.where;

  if (
    !whereProperty ||
    typeof whereProperty !== 'object' ||
    !Array.isArray(whereProperty.allOf) ||
    whereProperty.allOf.length < 2
  ) {
    // Nothing to do if the schema already moved away from the intersection shape.
    return;
  }

  const [conditionRefCandidate, stepsSchemaCandidate] = whereProperty.allOf;

  if (
    !conditionRefCandidate ||
    typeof conditionRefCandidate !== 'object' ||
    typeof conditionRefCandidate.$ref !== 'string'
  ) {
    return;
  }

  // The second component of the intersection holds the `steps` schema definition.
  if (
    !stepsSchemaCandidate ||
    typeof stepsSchemaCandidate !== 'object' ||
    !stepsSchemaCandidate.properties ||
    !stepsSchemaCandidate.properties.steps
  ) {
    return;
  }

  const conditionSchema = resolveJsonPointer(rootSchema, conditionRefCandidate.$ref);
  if (!conditionSchema) {
    return;
  }

  const stepsPropertySchema = stepsSchemaCandidate.properties.steps;
  const shouldRequireSteps =
    Array.isArray(stepsSchemaCandidate.required) && stepsSchemaCandidate.required.includes('steps');

  const augmentedConditionSchema = augmentConditionSchemaWithSteps(
    conditionSchema,
    stepsPropertySchema,
    shouldRequireSteps
  );

  if (!augmentedConditionSchema) {
    return;
  }

  if (Array.isArray(augmentedConditionSchema.anyOf)) {
    // Preserve the union style from the source schema whenever possible to keep
    // downstream tooling behaviour identical.
    whereProperty.anyOf = augmentedConditionSchema.anyOf;
  } else if (Array.isArray(augmentedConditionSchema.oneOf)) {
    whereProperty.oneOf = augmentedConditionSchema.oneOf;
  } else {
    whereProperty.anyOf = [augmentedConditionSchema];
  }

  whereProperty.type = 'object';
  whereProperty.properties = {
    ...(whereProperty.properties ?? {}),
    steps: stepsPropertySchema,
  };

  if (shouldRequireSteps) {
    const requiredSet = new Set<string>(
      Array.isArray(whereProperty.required) ? whereProperty.required : []
    );
    requiredSet.add('steps');
    whereProperty.required = Array.from(requiredSet);
  }

  delete whereProperty.allOf;
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
 * Clone the condition schema referenced by a where block and augment every
 * branch with the nested steps definition so editors do not need to follow the
 * original `$ref`.
 */
function augmentConditionSchemaWithSteps(
  conditionSchema: any,
  stepsPropertySchema: any,
  shouldRequireSteps: boolean
): any {
  if (!conditionSchema || typeof conditionSchema !== 'object') {
    return undefined;
  }

  const clonedSchema = deepClone(conditionSchema);
  return applyStepsToConditionNode(clonedSchema, stepsPropertySchema, shouldRequireSteps);
}

/**
 * Recursively attach the `steps` property to every object node found within the
 * condition schema. This is required because Streamlang conditions can be
 * arbitrarily composed via `anyOf`, `allOf`, and `oneOf`.
 */
function applyStepsToConditionNode(
  node: any,
  stepsPropertySchema: any,
  shouldRequireSteps: boolean
): any {
  if (!node || typeof node !== 'object') {
    return node;
  }

  if (Array.isArray(node.anyOf)) {
    return {
      ...node,
      anyOf: node.anyOf.map((option: any) =>
        applyStepsToConditionNode(option, stepsPropertySchema, shouldRequireSteps)
      ),
    };
  }

  if (Array.isArray(node.oneOf)) {
    return {
      ...node,
      oneOf: node.oneOf.map((option: any) =>
        applyStepsToConditionNode(option, stepsPropertySchema, shouldRequireSteps)
      ),
    };
  }

  if (Array.isArray(node.allOf)) {
    return {
      ...node,
      allOf: node.allOf.map((option: any) =>
        applyStepsToConditionNode(option, stepsPropertySchema, shouldRequireSteps)
      ),
    };
  }

  const hasObjectShape =
    node.type === 'object' ||
    node.properties ||
    Array.isArray(node.required) ||
    node.additionalProperties !== undefined;

  if (!hasObjectShape) {
    return node;
  }

  const updatedNode = {
    ...node,
    properties: {
      ...(node.properties ?? {}),
      steps: stepsPropertySchema,
    },
  };

  if (shouldRequireSteps) {
    const requiredSet = new Set<string>(Array.isArray(node.required) ? node.required : []);
    requiredSet.add('steps');
    updatedNode.required = Array.from(requiredSet);
  }

  if (!updatedNode.type) {
    updatedNode.type = 'object';
  }

  return updatedNode;
}

/**
 * Utility helper used throughout this module. All schema fragments are plain
 * JSON-like objects, so serialising to and from JSON is a safe cloning strategy
 * that preserves nested structures without pulling in an additional dependency.
 */
function deepClone<T = any>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}
