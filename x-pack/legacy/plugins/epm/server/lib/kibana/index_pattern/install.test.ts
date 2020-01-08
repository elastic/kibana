/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import path from 'path';
import { readFileSync } from 'fs';
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

const loadYamlFile = (filePath: string) => {
  const ymlPath = path.join(__dirname, filePath);
  const fieldsYML = readFileSync(ymlPath, 'utf-8');
  const fields: Field[] = safeLoad(fieldsYML);
  return fields;
};
const fields = loadYamlFile('./tests/nginx.fields.yml');
const accessEcsFields = loadYamlFile('./tests/nginx.access.ecs.yml');
const errorEcsFields = loadYamlFile('./tests/nginx.error.ecs.yml');

test('flattenFields function recurseively flattens nested fields and renames name property with path', () => {
  const flattened = flattenFields(fields);
  expect(flattened).toMatchSnapshot('flattenFields');
});

test('dedupFields function remove duplicated fields when parsing multiple files', () => {
  const allFields = accessEcsFields.concat(errorEcsFields);
  const deduped = dedupFields(allFields);
  expect(deduped).toMatchSnapshot('dedupFields');
});
