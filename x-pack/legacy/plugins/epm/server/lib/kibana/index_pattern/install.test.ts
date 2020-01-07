/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flattenFields, dedupFields } from './install';
import { unflattenedFieldsArray } from './tests/unflattened_fields_array';
import { duplicatedFieldsArray } from './tests/duplicated_fields_array';

// Add our own serialiser to just do JSON.stringify
expect.addSnapshotSerializer({
  print(val) {
    return JSON.stringify(val, null, 2);
  },

  test(val) {
    return val;
  },
});

test('flattenFields function', () => {
  const flattened = flattenFields(unflattenedFieldsArray);
  expect(flattened).toMatchSnapshot('flattenFields');
});

test('dedupFields function', () => {
  const deduped = dedupFields(duplicatedFieldsArray);
  expect(deduped).toMatchSnapshot('dedupFields');
});
