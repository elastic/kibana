/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const reduceFields = (
  fields: readonly string[],
  fieldMap: Readonly<Record<string, string>>
): readonly string[] =>
  fields.reduce(
    (res, field) => (fieldMap[field] != null ? [...res, fieldMap[field]] : res),
    [] as readonly string[]
  );
