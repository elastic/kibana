/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTemplate, generateMappings } from './template';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { safeLoad } from 'js-yaml';
import { Field, processFields } from '../../fields/field';

test('get template', () => {
  const pattern = 'logs-nginx-access-abcd-*';

  const template = getTemplate(pattern, { properties: {} });
  expect(template.index_patterns).toStrictEqual([pattern]);
});

test('tests loading fields.yml', () => {
  // Load fields.yml file
  const fieldsYML = readFileSync(path.join(__dirname, '../../fields/tests/base.yml'), 'utf-8');
  const fields: Field[] = safeLoad(fieldsYML);

  processFields(fields);
  const mappings = generateMappings(fields);
  const template = getTemplate('foo', mappings);

  const json = JSON.stringify(template, null, 2);
  const generatedFile = path.join(__dirname, '../../fields/tests/base.template.generate.json');

  // Regenerate the file if `-generate` flag is used
  if (process.argv.includes('-generate')) {
    writeFileSync(generatedFile, json);
  }

  const jsonData = readFileSync(generatedFile, 'utf-8');

  // Check that content file and generated file are equal
  expect(jsonData).toBe(json);
});
