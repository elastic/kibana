/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serializeConnectorSpec } from '@kbn/connector-specs/src/lib/serialize_connector_spec';
import { fromConnectorSpecSchema } from '@kbn/connector-specs/src/lib/deserialize_connector_spec';
import { buildVersion } from './build_version';
import { withTypeMetadata } from './build_spec';
import {
  ABUSE_IPDB_SPEC_FIXTURE,
  LIVE_OKTA_1_0_YAML,
  TYPE_METADATA_FIXTURE,
} from './test_fixtures';

describe('buildVersion', () => {
  it('builds a contract without type metadata', () => {
    const built = buildVersion(ABUSE_IPDB_SPEC_FIXTURE);
    expect(built.id).toBe('.abuseipdb');
    expect(built.version).toBe('1.0');
    expect(Object.keys(built.spec.actions)).toEqual(['checkIp', 'reportIp']);
    expect(built.spec.test.enabled).toBe(true);
    const spec = withTypeMetadata(built.id, built.spec, TYPE_METADATA_FIXTURE);
    expect(spec.metadata.displayName).toBe('AbuseIPDB');
    expect(spec.metadata.icon).toBeUndefined();
  });

  it('builds the live Okta catalog definition', () => {
    const built = buildVersion(LIVE_OKTA_1_0_YAML);
    expect(built.id).toBe('.okta');
    expect(Object.keys(built.spec.actions)).toEqual(['listUsers', 'getLogs']);
  });

  it('rejects unknown auth types', () => {
    expect(() =>
      buildVersion(
        ABUSE_IPDB_SPEC_FIXTURE.replace('type: api_key_header', 'type: future_auth_type')
      )
    ).toThrow('auth type "future_auth_type", which is not registered in this Kibana version');
  });

  it('round-trips the materialized spec and rejects unknown config keys', () => {
    const built = buildVersion(ABUSE_IPDB_SPEC_FIXTURE);
    const spec = withTypeMetadata(built.id, built.spec, TYPE_METADATA_FIXTURE);
    const serialized = serializeConnectorSpec(spec);
    const restored = fromConnectorSpecSchema(serialized.schema);
    const secrets = { authType: 'api_key_header', Key: 'test-key' };
    expect(
      restored?.parse({
        config: { baseUrl: 'https://api.abuseipdb.com' },
        secrets,
      })
    ).toEqual(
      expect.objectContaining({
        config: { baseUrl: 'https://api.abuseipdb.com' },
      })
    );
    expect(() =>
      restored?.parse({
        config: { baseUrl: 'https://api.abuseipdb.com', extra: true },
        secrets,
      })
    ).toThrow();
  });
});
