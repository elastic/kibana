/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy, partition, uniq } from 'lodash';
import { z } from '@kbn/zod';

/** A field and every schema it has across the union variants that hold it. */
interface Field {
  name: string;
  required: boolean;
  schemas: z.ZodType[];
}

/** What the index states about a field. */
interface FieldModel {
  name: string;
  required: boolean;
  values: unknown[];
  fields: FieldModel[];
}

/** The index lists section fields and their own fields, never deeper. */
const MAX_FIELD_DEPTH = 2;

/**
 * Nested fields list their values only when there are a few, so long lists
 * (format units, color types) do not repeat on every line.
 */
const MAX_NESTED_ENUM_VALUES = 4;

/** Looks through wrappers that do not change which fields or values a schema holds. */
const unwrap = (schema: z.ZodType): z.ZodType => {
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault
  ) {
    return unwrap(schema.unwrap() as z.ZodType);
  }
  if (schema instanceof z.ZodArray) {
    return unwrap(schema.element as z.ZodType);
  }
  return schema;
};

const getVariants = (schema: z.ZodType): z.ZodType[] => {
  const unwrapped = unwrap(schema);
  return unwrapped instanceof z.ZodUnion ? ([...unwrapped.options] as z.ZodType[]) : [];
};

/** Merges the fields of union variants. A field is required only when every variant requires it. */
const mergeVariantFields = (variants: Field[][]): Field[] => {
  const merged = new Map<string, Field>();
  variants.flat().forEach(({ name, schemas }) => {
    const field = merged.get(name);
    merged.set(name, {
      name,
      required: variants.every((fields) => fields.some((f) => f.name === name && f.required)),
      schemas: field ? uniq([...field.schemas, ...schemas]) : schemas,
    });
  });
  return [...merged.values()];
};

/** Merges the fields of intersected parts. A field is required when any part requires it. */
const mergePartFields = (fields: Field[]): Field[] =>
  Object.values(groupBy(fields, 'name')).map((group) => ({
    name: group[0].name,
    required: group.some(({ required }) => required),
    schemas: uniq(group.flatMap(({ schemas }) => schemas)),
  }));

/** Object fields of a schema, looking through wrappers, arrays, unions, and intersections. */
const getFields = (schema: z.ZodType): Field[] => {
  const unwrapped = unwrap(schema);
  if (unwrapped instanceof z.ZodObject) {
    return Object.entries(unwrapped.shape as Record<string, z.ZodType>).map(([name, field]) => ({
      name,
      required: !field.isOptional(),
      schemas: [field],
    }));
  }
  if (unwrapped instanceof z.ZodIntersection) {
    const { left, right } = unwrapped.def;
    return mergePartFields([...getFields(left as z.ZodType), ...getFields(right as z.ZodType)]);
  }
  return mergeVariantFields(getVariants(unwrapped).map(getFields));
};

/** Allowed values of an enum, a literal, or a union whose every variant is one of them. */
const getValues = (schema: z.ZodType): unknown[] => {
  const unwrapped = unwrap(schema);
  if (unwrapped instanceof z.ZodEnum) {
    return unwrapped.options;
  }
  if (unwrapped instanceof z.ZodLiteral) {
    return [...unwrapped.values];
  }
  const values = getVariants(unwrapped).map(getValues);
  return values.length > 0 && values.every((variantValues) => variantValues.length > 0)
    ? uniq(values.flat())
    : [];
};

const toFieldModels = (fields: Field[], depth = 1): FieldModel[] =>
  fields.map(({ name, required, schemas }) => {
    const values = schemas.map(getValues);
    return {
      name,
      required,
      values: values.every((schemaValues) => schemaValues.length > 0) ? uniq(values.flat()) : [],
      fields:
        depth < MAX_FIELD_DEPTH
          ? toFieldModels(mergeVariantFields(schemas.map(getFields)), depth + 1)
          : [],
    };
  });

/** Renders a field as `name*: a|b`, or as `name (subfields)` when it has fields of its own. */
const renderField = ({ name, required, values, fields }: FieldModel, depth = 1): string => {
  const label = required ? `${name}*` : name;
  if (fields.length > 0) {
    return `${label} (${fields.map((field) => renderField(field, depth + 1)).join(', ')})`;
  }
  const maxValues = depth > 1 ? MAX_NESTED_ENUM_VALUES : Infinity;
  return values.length > 0 && values.length <= maxValues ? `${label}: ${values.join('|')}` : label;
};

/**
 * Lists the fields every variant shares once, then the fields of each variant. Fixed-value
 * fields (e.g. `type: primary`) name a variant, so they come first in it.
 */
const renderVariants = (variants: FieldModel[][]): string => {
  const variantFields = variants.map((fields) => {
    const [fixedFields, otherFields] = partition(fields, ({ values }) => values.length === 1);
    return [...fixedFields, ...otherFields].map((field) => renderField(field));
  });
  const [firstFields] = variantFields;
  const sharedFields = firstFields.filter((field) =>
    variantFields.every((fields) => fields.includes(field))
  );
  const variantDescriptions = variantFields.map(
    (fields) => `(${fields.filter((field) => !sharedFields.includes(field)).join(', ')})`
  );
  return [...sharedFields, `one of: ${variantDescriptions.join(' | ')}`].join(', ');
};

/**
 * Keeps union variants apart when they hold different fields, because merging them
 * would hide which field belongs to which variant.
 */
const describeSection = (section: z.ZodType): string => {
  const variants = getVariants(section).map((variant) => toFieldModels(getFields(variant)));
  const fieldSets = variants.map((fields) =>
    fields
      .map(({ name }) => name)
      .sort()
      .join()
  );
  if (variants.length > 1 && fieldSets.every(Boolean) && new Set(fieldSets).size > 1) {
    return renderVariants(variants);
  }
  const fields = toFieldModels(getFields(section));
  return fields.length > 0
    ? fields.map((field) => renderField(field)).join(', ')
    : z.toJSONSchema(section, { io: 'input' }).type?.toString() ?? 'value';
};

/**
 * Lists each section with the fields it holds, one line per section. Listing enum values lets
 * the model write fields like `layers[].type` without loading the section or guessing values.
 */
export const buildSchemaSectionIndex = ({ shape }: z.ZodObject): string =>
  Object.entries(shape as Record<string, z.ZodType>)
    .map(([name, section]) => `- ${name}: ${describeSection(section)}`)
    .join('\n');
