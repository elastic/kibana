/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readFileSync } from 'fs';
import { safeLoad } from 'js-yaml';

// This should become a copy of https://github.com/elastic/beats/blob/d9a4c9c240a9820fab15002592e5bb6db318543b/libbeat/mapping/field.go#L39
export interface Field {
  keyword: string;
  type: string;
  required: boolean;
  description: string;
  fields: Field[];
}

test('test reading fields.yml', () => {
  const yaml = readFileSync(__dirname + '/tests/fields.yml');
  const data = safeLoad(yaml.toString());

  console.log(keyword());
  data.forEach(data => {
    console.log(data as Field);
  });
  expect(1 + 2).toStrictEqual(3);
});

function getDefaultProperties() {
  // TODO: do be extended with https://github.com/elastic/beats/blob/d9a4c9c240a9820fab15002592e5bb6db318543b/libbeat/template/processor.go#L364
  // Currently no defaults exist
  return {};
}

function keyword() {
  const property = getDefaultProperties();

  property.type = 'keyword';

  return property;
}
