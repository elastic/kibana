/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const convertRuleTagsToMatchAllKQL = (tags: string[]): string => {
  const TAGS_FIELD = 'alert.attributes.tags';
  return `${TAGS_FIELD}:(${tags.map((tag) => `"${tag}"`).join(` AND `)})`;
};

export const convertRuleTagsToMatchAnyKQL = (tags: string[]): string => {
  const TAGS_FIELD = 'alert.attributes.tags';
  return `${TAGS_FIELD}:(${tags.map((tag) => `"${tag}"`).join(` OR `)})`;
};
