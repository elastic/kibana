/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ControlFieldTypes = Record<string, string>;

export type ResolveAggregatableControlFieldResult =
  | { fieldName: string; error?: never }
  | { fieldName?: never; error: string };

const NON_AGGREGATABLE_TYPES = new Set([
  'text',
  'match_only_text',
  'annotated_text',
  'search_as_you_type',
  'semantic_text',
]);

const isAggregatable = (fields: ControlFieldTypes, fieldName: string): boolean => {
  const type = fields[fieldName];
  return type !== undefined && !NON_AGGREGATABLE_TYPES.has(type);
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
  fields: ControlFieldTypes;
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
