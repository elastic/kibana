/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadFixture } from './__fixtures__/load_fixture';
import { declarativeJsonSchemaToZod } from './json_schema_to_zod';
import { parseDeclarativeConnectorSpec } from './parse_declarative_connector_spec';

describe('declarativeJsonSchemaToZod', () => {
  const connector = parseDeclarativeConnectorSpec(loadFixture('abuseipdb-1.1.0.yaml'));

  it('converts checkIp input, applies defaults, and rejects unknown or out-of-range values', () => {
    const schema = declarativeJsonSchemaToZod(connector.actions.checkIp.input);

    expect(schema.parse({ ipAddress: '1.2.3.4' })).toEqual({
      ipAddress: '1.2.3.4',
      maxAgeInDays: 90,
      verbose: false,
    });
    expect(() => schema.parse({ ipAddress: '1.2.3.4', extra: true })).toThrow();
    expect(() => schema.parse({ ipAddress: '1.2.3.4', maxAgeInDays: 0 })).toThrow();
  });

  it('converts reportIp categories to an array of integers', () => {
    const schema = declarativeJsonSchemaToZod(connector.actions.reportIp.input);

    expect(schema.parse({ ip: '1.2.3.4', categories: [18, 22] })).toEqual({
      ip: '1.2.3.4',
      categories: [18, 22],
    });
    expect(() => schema.parse({ ip: '1.2.3.4', categories: [1.5] })).toThrow();
  });

  it('applies the config baseUrl default', () => {
    const schema = declarativeJsonSchemaToZod(connector.config);

    expect(schema.parse({})).toEqual({ baseUrl: 'http://127.0.0.1:8090' });
  });
});
