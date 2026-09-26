/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import path from 'path';
import type { TypeMetadataState } from './types';
import { signCatalogForTests } from './signature';
import { getContentHash } from './icon';

export const CONNECTOR_ICON_FIXTURE =
  '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1H0z"/></svg>';

export const TYPE_METADATA_FIXTURE: TypeMetadataState = {
  displayName: 'AbuseIPDB',
  description: 'Test AbuseIPDB connector',
  minimumLicense: 'gold',
  supportedFeatureIds: ['workflows'],
};

export const ABUSE_IPDB_SPEC_FIXTURE = `
schemaVersion: 1
id: .abuseipdb
version: "1.0"
config:
  type: object
  additionalProperties: false
  required: [baseUrl]
  properties:
    baseUrl:
      type: string
      format: uri
      default: http://127.0.0.1:8090
auth:
  types:
    - type: api_key_header
      defaults:
        headerField: Key
actions:
  checkIp:
    input:
      type: object
      required: [ipAddress]
      properties:
        ipAddress:
          type: string
          format: ipv4
    request:
      method: GET
      baseUrl: "{{ config.baseUrl }}"
      path: /api/v2/check
  reportIp:
    input:
      type: object
    request:
      method: POST
      baseUrl: "{{ config.baseUrl }}"
      path: /api/v2/report
test:
  request:
    method: GET
    baseUrl: "{{ config.baseUrl }}"
    path: /api/v2/check
`;

export const OKTA_SPEC_FIXTURE = `
schemaVersion: 1
id: .okta
version: "1.0"
config:
  type: object
  additionalProperties: false
  required: [orgUrl]
  properties:
    orgUrl:
      type: string
      format: uri
auth:
  types:
    - type: api_key_header
      defaults:
        headerField: Authorization
      prefix: "SSWS "
actions:
  listUsers:
    input:
      type: object
    request:
      method: GET
      baseUrl: "{{ config.orgUrl }}"
      path: /api/v1/users
test:
  request:
    method: GET
    baseUrl: "{{ config.orgUrl }}"
    path: /api/v1/users
`;

const liveFixture = (name: string): string =>
  readFileSync(path.join(__dirname, 'live_fixtures', name), 'utf8');

export const LIVE_CATALOG_MANIFEST = liveFixture('catalog.json');
export const LIVE_CATALOG_SIGNATURE = liveFixture('catalog.json.sig').trim();
export const LIVE_ABUSEIPDB_1_1_YAML = liveFixture('connectors/abuseipdb/1.1.yaml');
export const LIVE_ABUSEIPDB_1_0_YAML = liveFixture('connectors/abuseipdb/1.0.yaml');
export const LIVE_ABUSEIPDB_ICON = liveFixture(
  'connectors/abuseipdb/icons/sha256:c2ed2c5ebe15e0b513f760b11b0bdd149236d298f06612f468368901ce19e012.svg'
);
export const LIVE_OKTA_1_0_YAML = liveFixture('connectors/okta/1.0.yaml');
export const LIVE_OKTA_ICON = liveFixture(
  'connectors/okta/icons/sha256:61285080a6b979ac58e3a9f3c07ed506ee9075db01bd088bfdeaa1a57bdb9f84.svg'
);

/** @deprecated Use LIVE_ABUSEIPDB_1_1_YAML. */
export const LIVE_ABUSEIPDB_1_1_0_YAML = LIVE_ABUSEIPDB_1_1_YAML;
/** @deprecated Use LIVE_ABUSEIPDB_1_0_YAML. */
export const LIVE_ABUSEIPDB_1_0_0_YAML = LIVE_ABUSEIPDB_1_0_YAML;
/** @deprecated Use LIVE_OKTA_1_0_YAML. */
export const LIVE_OKTA_1_0_0_YAML = LIVE_OKTA_1_0_YAML;

export const LIVE_CATALOG_PATHS = {
  manifest: '/catalog.json',
  signature: '/catalog.json.sig',
  abuseipdbDefinition: '/connectors/abuseipdb/1.1.yaml',
  abuseipdbPublishedDefinition: '/connectors/abuseipdb/1.0.yaml',
  abuseipdbIcon:
    '/connectors/abuseipdb/icons/sha256:c2ed2c5ebe15e0b513f760b11b0bdd149236d298f06612f468368901ce19e012.svg',
  oktaDefinition: '/connectors/okta/1.0.yaml',
  oktaIcon:
    '/connectors/okta/icons/sha256:61285080a6b979ac58e3a9f3c07ed506ee9075db01bd088bfdeaa1a57bdb9f84.svg',
} as const;

const DEV_PRIVATE_KEY = readFileSync(
  path.join(__dirname, '__fixtures__/dev_signing_key/catalog_dev_private_key.pem'),
  'utf8'
);

export const signedManifestFixture = (
  overrides: Record<string, unknown> = {}
): { bytes: string; signature: string } => {
  const manifest = {
    schemaVersion: 1,
    catalogVersion: 'sha256:test',
    sequence: 1,
    typeMetadata: {
      '.abuseipdb': {
        displayName: 'AbuseIPDB',
        description: 'Test',
        minimumLicense: 'gold',
        supportedFeatureIds: ['workflows'],
      },
    },
    connectors: [
      {
        id: '.abuseipdb',
        version: '1.0',
        definitionUrl: 'connectors/abuseipdb/1.0.yaml',
        contentHash: getContentHash(ABUSE_IPDB_SPEC_FIXTURE),
      },
    ],
    ...overrides,
  };
  const bytes = `${JSON.stringify(manifest)}\n`;
  return { bytes, signature: signCatalogForTests(bytes, DEV_PRIVATE_KEY) };
};

export interface FetchDoubleResponse {
  body?: string;
  status?: number;
  url?: string;
  error?: Error;
}

export const createFetchDouble = (responses: Record<string, FetchDoubleResponse>) => {
  return jest.fn(async (url: string) => {
    const href = String(url);
    const pathname = new URL(href).pathname;
    const match =
      responses[pathname] ??
      responses[href] ??
      responses[pathname.replace(/^\//, '')] ??
      responses[`${pathname}${new URL(href).search}`];
    if (!match) {
      throw new Error(`Unexpected catalog fetch: ${href}`);
    }
    if (match.error) {
      throw match.error;
    }
    const status = match.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      url: match.url ?? href,
      text: async () => match.body ?? '',
    };
  });
};

export const createLiveCatalogFetchDouble = (overrides: Record<string, FetchDoubleResponse> = {}) =>
  createFetchDouble({
    [LIVE_CATALOG_PATHS.manifest]: { body: LIVE_CATALOG_MANIFEST },
    [LIVE_CATALOG_PATHS.signature]: { body: LIVE_CATALOG_SIGNATURE },
    [LIVE_CATALOG_PATHS.abuseipdbDefinition]: { body: LIVE_ABUSEIPDB_1_1_YAML },
    [LIVE_CATALOG_PATHS.abuseipdbPublishedDefinition]: { body: LIVE_ABUSEIPDB_1_0_YAML },
    [LIVE_CATALOG_PATHS.abuseipdbIcon]: { body: LIVE_ABUSEIPDB_ICON },
    [LIVE_CATALOG_PATHS.oktaDefinition]: { body: LIVE_OKTA_1_0_YAML },
    [LIVE_CATALOG_PATHS.oktaIcon]: { body: LIVE_OKTA_ICON },
    ...overrides,
  });
