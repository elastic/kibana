/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import path from 'path';
import { readFileSync } from 'fs';
import glob from 'glob';
import { safeLoad } from 'js-yaml';
import { flattenFields, dedupeFields, transformField } from './install';
import { Fields } from '../../fields/field';

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
let fields: Fields = [];
for (const file of files) {
  const fieldsYML = readFileSync(file, 'utf-8');
  fields = fields.concat(safeLoad(fieldsYML));
}

describe('creating index patterns from yaml fields', () => {
  test('flattenFields function recursively flattens nested fields and renames name property with path', () => {
    const flattened = flattenFields(fields);
    expect(flattened).toMatchSnapshot('flattenFields');
  });

  test('dedupFields function remove duplicated fields when parsing multiple files', () => {
    const deduped = dedupeFields(fields);
    expect(deduped).toMatchSnapshot('dedupeFields');
  });

  test('transformField maps field types to kibana index pattern data types', () => {
    expect(transformField({ name: 'testField' }).type).toBe('string');
    expect(transformField({ name: 'testField', type: 'half_float' }).type).toBe('number');
    expect(transformField({ name: 'testField', type: 'scaled_float' }).type).toBe('number');
    expect(transformField({ name: 'testField', type: 'float' }).type).toBe('number');
    expect(transformField({ name: 'testField', type: 'integer' }).type).toBe('number');
    expect(transformField({ name: 'testField', type: 'long' }).type).toBe('number');
    expect(transformField({ name: 'testField', type: 'short' }).type).toBe('number');
    expect(transformField({ name: 'testField', type: 'byte' }).type).toBe('number');
    expect(transformField({ name: 'testField', type: 'keyword' }).type).toBe('string');
    expect(transformField({ name: 'testField', type: 'invalidType' }).type).toBe(undefined);
    expect(transformField({ name: 'testField', type: 'text' }).type).toBe('string');
    expect(transformField({ name: 'testField', type: 'date' }).type).toBe('date');
    expect(transformField({ name: 'testField', type: 'geo_point' }).type).toBe('geo_point');
    expect(transformField({ name: 'testField', type: 'invalid' }).type).toBe(undefined);
  });

  test('transformField changes values based on other values', () => {
    expect(transformField({ name: 'testField' }).count).toBe(0);
    expect(transformField({ name: 'testField', count: 4 }).count).toBe(4);

    // searchable
    expect(transformField({ name: 'testField' }).searchable).toBe(true);
    expect(transformField({ name: 'testField', searchable: true }).searchable).toBe(true);
    expect(transformField({ name: 'testField', searchable: false }).searchable).toBe(false);
    expect(transformField({ name: 'testField', type: 'binary' }).searchable).toBe(false);
    expect(transformField({ name: 'testField', searchable: true, type: 'binary' }).searchable).toBe(
      false
    );

    // aggregatable
    expect(transformField({ name: 'testField' }).aggregatable).toBe(true);
    expect(transformField({ name: 'testField', aggregatable: true }).aggregatable).toBe(true);
    expect(transformField({ name: 'testField', aggregatable: false }).aggregatable).toBe(false);
    expect(transformField({ name: 'testField', type: 'binary' }).aggregatable).toBe(false);
    expect(
      transformField({ name: 'testField', aggregatable: true, type: 'binary' }).aggregatable
    ).toBe(false);
    expect(transformField({ name: 'testField', type: 'keyword' }).aggregatable).toBe(true);
    expect(
      transformField({ name: 'testField', aggregatable: true, type: 'text' }).aggregatable
    ).toBe(false);
    expect(transformField({ name: 'testField', type: 'text' }).aggregatable).toBe(false);

    // analyzed
    expect(transformField({ name: 'testField' }).analyzed).toBe(false);
    expect(transformField({ name: 'testField', analyzed: true }).analyzed).toBe(true);
    expect(transformField({ name: 'testField', analyzed: false }).analyzed).toBe(false);
    expect(transformField({ name: 'testField', type: 'binary' }).analyzed).toBe(false);
    expect(transformField({ name: 'testField', analyzed: true, type: 'binary' }).analyzed).toBe(
      false
    );

    // doc_values always set to true except for meta fields
    expect(transformField({ name: 'testField' }).doc_values).toBe(true);
    expect(transformField({ name: 'testField', doc_values: true }).doc_values).toBe(true);
    expect(transformField({ name: 'testField', doc_values: false }).doc_values).toBe(false);
    expect(transformField({ name: 'testField', script: 'doc[]' }).doc_values).toBe(false);
    expect(
      transformField({ name: 'testField', doc_values: true, script: 'doc[]' }).doc_values
    ).toBe(false);
    expect(transformField({ name: 'testField', type: 'binary' }).doc_values).toBe(false);
    expect(transformField({ name: 'testField', doc_values: true, type: 'binary' }).doc_values).toBe(
      true
    );

    // enabled - only applies to objects (and only if set)
    expect(transformField({ name: 'testField', type: 'binary', enabled: false }).enabled).toBe(
      undefined
    );
    expect(transformField({ name: 'testField', type: 'binary', enabled: true }).enabled).toBe(
      undefined
    );
    expect(transformField({ name: 'testField', type: 'object', enabled: true }).enabled).toBe(true);
    expect(transformField({ name: 'testField', type: 'object', enabled: false }).enabled).toBe(
      false
    );
    expect(transformField({ name: 'testField', type: 'object', enabled: false }).doc_values).toBe(
      false
    );

    // indexed
    expect(transformField({ name: 'testField', type: 'binary' }).indexed).toBe(false);
    expect(transformField({ name: 'testField', index: true, type: 'binary' }).indexed).toBe(false);

    // script, scripted
    expect(transformField({ name: 'testField' }).scripted).toBe(false);
    expect(transformField({ name: 'testField' }).script).toBe(undefined);
    expect(transformField({ name: 'testField', script: 'doc[]' }).scripted).toBe(true);
    expect(transformField({ name: 'testField', script: 'doc[]' }).script).toBe('doc[]');

    // language
    expect(transformField({ name: 'testField' }).lang).toBe(undefined);
    expect(transformField({ name: 'testField', script: 'doc[]' }).lang).toBe('painless');
  });
});
