/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseCatalogManifest } from './parse_manifest';
import { parseCatalogContract } from './parse_spec';
import { verifyCatalogSignature } from './signature';
import { CATALOG_PUBLIC_KEYS } from './keys/catalog_public_keys';
import { getContentHash } from './icon';
import { loggerMock } from '@kbn/logging-mocks';
import {
  LIVE_CATALOG_MANIFEST,
  LIVE_CATALOG_SIGNATURE,
  LIVE_ABUSEIPDB_1_0_YAML,
  LIVE_ABUSEIPDB_1_1_YAML,
  LIVE_OKTA_1_0_YAML,
} from './test_fixtures';

describe('live catalog fixtures', () => {
  it('verifies catalog.json.sig with the dev public key', () => {
    expect(
      verifyCatalogSignature(LIVE_CATALOG_MANIFEST, LIVE_CATALOG_SIGNATURE, CATALOG_PUBLIC_KEYS)
    ).toBe(true);
  });

  it('matches every row hash to the committed YAML and parses strictly', () => {
    const manifest = parseCatalogManifest(JSON.parse(LIVE_CATALOG_MANIFEST), loggerMock.create());
    const files: Record<string, string> = {
      'connectors/abuseipdb/1.0.yaml': LIVE_ABUSEIPDB_1_0_YAML,
      'connectors/abuseipdb/1.1.yaml': LIVE_ABUSEIPDB_1_1_YAML,
      'connectors/okta/1.0.yaml': LIVE_OKTA_1_0_YAML,
    };
    for (const row of manifest.connectors) {
      const yaml = files[row.definitionUrl];
      expect(yaml).toBeDefined();
      expect(getContentHash(yaml)).toBe(row.contentHash);
      expect(parseCatalogContract(yaml).version).toBe(row.version);
    }
  });
});
