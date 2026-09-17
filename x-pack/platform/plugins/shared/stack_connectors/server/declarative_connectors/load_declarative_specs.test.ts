/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serializeConnectorSpec } from '@kbn/connector-specs/src/lib/serialize_connector_spec';
import { fromConnectorSpecSchema } from '@kbn/connector-specs/src/lib/deserialize_connector_spec';
import { loggerMock } from '@kbn/logging-mocks';
import { FsSpecReader } from './fs_spec_reader';
import { getContentHash } from './icon';
import { loadDeclarativeConnectorSpecs } from './load_declarative_specs';
import { ConnectorSpecSource, type RawConnectorSpecAsset } from './spec_source';
import { ABUSE_IPDB_SPEC_FIXTURE, CONNECTOR_ICON_FIXTURE } from './test_fixtures';

class InMemorySpecSource extends ConnectorSpecSource {
  constructor(private readonly assets: RawConnectorSpecAsset[]) {
    super();
  }

  public loadRawSpecs(): RawConnectorSpecAsset[] {
    return this.assets;
  }
}

const matchingIconHash = getContentHash(CONNECTOR_ICON_FIXTURE);

const withIconHash = (yaml: string, contentHash: string): string =>
  yaml.replace(/contentHash: sha256:[a-f0-9]{64}/, `contentHash: ${contentHash}`);

describe('loadDeclarativeConnectorSpecs', () => {
  const logger = loggerMock.create();

  it('materializes the shipped AbuseIPDB spec from disk', () => {
    const [spec] = loadDeclarativeConnectorSpecs(new FsSpecReader(), logger);

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

  it('rejects an icon whose content hash does not match', () => {
    const source = new InMemorySpecSource([
      {
        yamlPath: '/tmp/abuseipdb.yaml',
        yaml: withIconHash(ABUSE_IPDB_SPEC_FIXTURE, `sha256:${'0'.repeat(64)}`),
        icon: CONNECTOR_ICON_FIXTURE,
      },
    ]);

    expect(() => loadDeclarativeConnectorSpecs(source, logger)).toThrow('integrity check');
  });

  it('rejects an unsafe svg icon', () => {
    const unsafeIcon = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    const source = new InMemorySpecSource([
      {
        yamlPath: '/tmp/abuseipdb.yaml',
        yaml: withIconHash(ABUSE_IPDB_SPEC_FIXTURE, getContentHash(unsafeIcon)),
        icon: unsafeIcon,
      },
    ]);

    expect(() => loadDeclarativeConnectorSpecs(source, logger)).toThrow(
      'unsupported active or external content'
    );
  });

  it('rejects duplicate connector ids', () => {
    const yaml = withIconHash(ABUSE_IPDB_SPEC_FIXTURE, matchingIconHash);
    const source = new InMemorySpecSource([
      { yamlPath: '/tmp/a.yaml', yaml, icon: CONNECTOR_ICON_FIXTURE },
      { yamlPath: '/tmp/b.yaml', yaml, icon: CONNECTOR_ICON_FIXTURE },
    ]);

    expect(() => loadDeclarativeConnectorSpecs(source, logger)).toThrow(
      'Duplicate declarative connector id ".abuseipdb"'
    );
  });

  it('round-trips the shipped spec and rejects unknown config keys', () => {
    const [spec] = loadDeclarativeConnectorSpecs(new FsSpecReader(), logger);
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

  it('rejects unknown auth types', () => {
    const yaml = withIconHash(
      ABUSE_IPDB_SPEC_FIXTURE.replace('type: api_key_header', 'type: future_auth_type'),
      matchingIconHash
    );
    const source = new InMemorySpecSource([
      { yamlPath: '/tmp/abuseipdb.yaml', yaml, icon: CONNECTOR_ICON_FIXTURE },
    ]);

    expect(() => loadDeclarativeConnectorSpecs(source, logger)).toThrow(
      'auth type "future_auth_type", which is not registered in this Kibana version'
    );
  });
});
