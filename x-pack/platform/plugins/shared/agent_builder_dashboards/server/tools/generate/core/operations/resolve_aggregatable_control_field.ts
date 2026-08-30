/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type FieldCapsTypeMap = Record<string, { aggregatable?: boolean; type?: string }>;

export type FieldCapsFields = Record<string, FieldCapsTypeMap>;

export type ResolveAggregatableControlFieldResult =
  | { fieldName: string; error?: never }
  | { fieldName?: never; error: string };

const isAggregatable = (fields: FieldCapsFields, fieldName: string): boolean => {
  const types = fields[fieldName];
  if (!types) {
    return false;
  }
  return Object.values(types).some((type) => type.aggregatable === true);
};

/**
 * Pick a control field that Elasticsearch can `STATS BY`. Prefer the requested
 * name when it is aggregatable; otherwise use a `.keyword` sibling.
 */
export const resolveAggregatableControlField = ({
  fieldName,
  fields,
}: {
  fieldName: string;
  fields: FieldCapsFields;
}): ResolveAggregatableControlFieldResult => {
  if (isAggregatable(fields, fieldName)) {
    return { fieldName };
  }

  const keywordSibling = `${fieldName}.keyword`;
  if (isAggregatable(fields, keywordSibling)) {
    return { fieldName: keywordSibling };
  }

  return {
    error: `Field "${fieldName}" is not an aggregatable field on this index.`,
  };
};
