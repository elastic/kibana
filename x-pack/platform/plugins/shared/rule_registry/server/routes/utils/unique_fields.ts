/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDescriptor, FieldSpec } from '@kbn/data-views-plugin/server';

export const mergeUniqueFieldsByName = (
  otherFields: FieldDescriptor[],
  siemFields: FieldSpec[]
): FieldDescriptor[] => {
  const uniqueMap = new Map();

  function addToMap(fields: FieldDescriptor[] | FieldSpec[]) {
    fields.forEach((field) => {
      uniqueMap.set(field.name, field);
    });
  }

  addToMap(otherFields);
  addToMap(siemFields);

  return Array.from(uniqueMap.values());
};
