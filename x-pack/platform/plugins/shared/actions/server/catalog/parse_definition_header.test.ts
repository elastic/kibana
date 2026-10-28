/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDefinitionHeader } from './parse_definition_header';

const valid = `schemaVersion: 1
id: .abuseipdb
version: "1.0"
`;

describe('parseDefinitionHeader', () => {
  it('reads a valid header', () => {
    expect(parseDefinitionHeader(valid)).toEqual({
      schemaVersion: 1,
      id: '.abuseipdb',
      version: '1.0',
    });
  });

  it('rejects a numeric version and hints to quote it', () => {
    expect(() => parseDefinitionHeader(valid.replace('version: "1.0"', 'version: 1.0'))).toThrow(
      /quoted MAJOR\.MINOR/
    );
  });

  it('rejects the wrong schemaVersion', () => {
    expect(() =>
      parseDefinitionHeader(valid.replace('schemaVersion: 1', 'schemaVersion: 2'))
    ).toThrow(/schemaVersion/);
  });

  it('rejects a non-object root', () => {
    expect(() => parseDefinitionHeader('- a\n- b\n')).toThrow(/object/);
  });

  it('rejects invalid YAML', () => {
    expect(() => parseDefinitionHeader(':\n  - [')).toThrow(/invalid/);
  });
});
