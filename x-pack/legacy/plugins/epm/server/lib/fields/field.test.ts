/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { safeLoad } from 'js-yaml';
import { Field, processFields } from './field';

test('tests loading fields.yml', () => {
  const fieldsYML = readFileSync(path.join(__dirname, '/tests/base.yml'), 'utf-8');

  const fields: Field[] = safeLoad(fieldsYML);

  processFields(fields);

  // Convert it json for easier comparison of the output
  const json = JSON.stringify(fields, null, 2);
  const generatedFile = path.join(__dirname, './tests/base.fields.generate.json');

  // Regenerate the file if `-generate` flag is used
  if (process.argv.includes('-generate')) {
    writeFileSync(generatedFile, json);
  }

  const jsonData = readFileSync(generatedFile, 'utf-8');

  // Check that content file and generated file are equal
  expect(jsonData).toBe(json);
});
