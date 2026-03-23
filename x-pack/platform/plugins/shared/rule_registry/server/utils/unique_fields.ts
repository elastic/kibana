/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDescriptor } from '@kbn/data-views-plugin/server';

export const mergeUniqueFieldsByName = (
  firstFields: FieldDescriptor[],
  secondFields: FieldDescriptor[]
): FieldDescriptor[] => {
  const uniqueMap = new Map();

  const addToMap = (fields: FieldDescriptor[]) =>
    fields.forEach((field) => {
      uniqueMap.set(field.name, field);
    });

  addToMap(firstFields);
  addToMap(secondFields);

  return Array.from(uniqueMap.values());
};
