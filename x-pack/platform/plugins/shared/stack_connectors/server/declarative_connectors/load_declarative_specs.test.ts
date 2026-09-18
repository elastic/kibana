/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serializeConnectorSpec } from '@kbn/connector-specs/src/lib/serialize_connector_spec';
import { fromConnectorSpecSchema } from '@kbn/connector-specs/src/lib/deserialize_connector_spec';
import { getContentHash } from './icon';
import { loadDeclarativeConnectorSpec } from './load_declarative_specs';
import {
  ABUSE_IPDB_SPEC_FIXTURE,
  CONNECTOR_ICON_FIXTURE,
  LIVE_OKTA_1_0_0_YAML,
  LIVE_OKTA_ICON,
} from './test_fixtures';

const matchingIconHash = getContentHash(CONNECTOR_ICON_FIXTURE);

const withIconHash = (yaml: string, contentHash: string): string =>
  yaml.replace(/contentHash: sha256:[a-f0-9]{64}/, `contentHash: ${contentHash}`);

const validAsset = (overrides: { yaml?: string; icon?: string } = {}) => ({
  yamlPath: '/tmp/abuseipdb.yaml',
  yaml: overrides.yaml ?? withIconHash(ABUSE_IPDB_SPEC_FIXTURE, matchingIconHash),
  icon: 'icon' in overrides ? overrides.icon : CONNECTOR_ICON_FIXTURE,
});

describe('loadDeclarativeConnectorSpec', () => {
  it('materializes a valid spec with a matching icon', () => {
    const spec = loadDeclarativeConnectorSpec(validAsset());

    expect(spec.metadata.id).toBe('.abuseipdb');
    expect(Object.keys(spec.actions)).toEqual(['checkIp', 'reportIp']);
    expect(spec.metadata.icon).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(spec.test.enabled).toBe(true);
    expect(spec.auth?.types).toEqual([
      expect.objectContaining({
        type: 'api_key_header',
        defaults: { headerField: 'Key' },
      }),
    ]);
  });

  it('materializes the live Okta catalog definition with its icon', () => {
    const spec = loadDeclarativeConnectorSpec({
      yamlPath: '/connectors/okta/1.0.0.yaml',
      yaml: LIVE_OKTA_1_0_0_YAML,
      icon: LIVE_OKTA_ICON,
    });

    expect(spec.metadata.id).toBe('.okta');
    expect(spec.metadata.displayName).toBe('Okta (Declarative PoC)');
    expect(Object.keys(spec.actions)).toEqual(['listUsers', 'getLogs']);
    expect(spec.metadata.icon).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(spec.test.enabled).toBe(true);
  });

  it('rejects an icon whose content hash does not match', () => {
    expect(() =>
      loadDeclarativeConnectorSpec(
        validAsset({ yaml: withIconHash(ABUSE_IPDB_SPEC_FIXTURE, `sha256:${'0'.repeat(64)}`) })
      )
    ).toThrow('integrity check');
  });

  it('rejects an unsafe svg icon', () => {
    const unsafeIcon = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    expect(() =>
      loadDeclarativeConnectorSpec(
        validAsset({
          yaml: withIconHash(ABUSE_IPDB_SPEC_FIXTURE, getContentHash(unsafeIcon)),
          icon: unsafeIcon,
        })
      )
    ).toThrow('unsupported active or external content');
  });

  it('rejects unknown auth types', () => {
    expect(() =>
      loadDeclarativeConnectorSpec(
        validAsset({
          yaml: withIconHash(
            ABUSE_IPDB_SPEC_FIXTURE.replace('type: api_key_header', 'type: future_auth_type'),
            matchingIconHash
          ),
        })
      )
    ).toThrow('auth type "future_auth_type", which is not registered in this Kibana version');
  });

  it('rejects a declared icon that was not provided', () => {
    expect(() =>
      loadDeclarativeConnectorSpec({
        yamlPath: '/tmp/abuseipdb.yaml',
        yaml: withIconHash(ABUSE_IPDB_SPEC_FIXTURE, matchingIconHash),
      })
    ).toThrow('declares an icon but no icon file was provided');
  });

  it('round-trips the materialized spec and rejects unknown config keys', () => {
    const spec = loadDeclarativeConnectorSpec(validAsset());
    const serialized = serializeConnectorSpec(spec);
    const restored = fromConnectorSpecSchema(serialized.schema);

    expect(restored).toBeDefined();

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
