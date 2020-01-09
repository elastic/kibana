/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import path from 'path';
import { readFileSync } from 'fs';
import glob from 'glob';
import { safeLoad } from 'js-yaml';
import { flattenFields, dedupFields } from './install';
import { Field } from '../../fields/field';

// Add our own serialiser to just do JSON.stringify
expect.addSnapshotSerializer({
  print(val) {
    return JSON.stringify(val, null, 2);
  },

  test(val) {
    return val;
  },
});
const files = glob.sync(path.join(__dirname, '/tests/*.yml'));
let allFields: Field[] = [];
for (const file of files) {
  const fieldsYML = readFileSync(file, 'utf-8');
  allFields = allFields.concat(safeLoad(fieldsYML));
}

test('flattenFields function recursively flattens nested fields and renames name property with path', () => {
  const flattened = flattenFields(allFields);
  expect(flattened).toMatchSnapshot('flattenFields');
});

test('dedupFields function remove duplicated fields when parsing multiple files', () => {
  const deduped = dedupFields(allFields);
  expect(deduped).toMatchSnapshot('dedupFields');
});
