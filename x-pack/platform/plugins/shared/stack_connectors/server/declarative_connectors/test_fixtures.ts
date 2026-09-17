/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import path from 'path';

export const CONNECTOR_ICON_FIXTURE =
  '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1H0z"/></svg>';

export const ABUSE_IPDB_SPEC_FIXTURE = `
schemaVersion: 1
id: .abuseipdb
version: 1.0.0
metadata:
  displayName: AbuseIPDB
  description: Test AbuseIPDB connector
  icon:
    path: 1.0.0.svg
    contentHash: sha256:65dc4e2bb86a7b2acccb0fac18449c2e49635004bcb5fbd73e39e6735ce8ac70
  minimumLicense: gold
  supportedFeatureIds: [workflows]
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
id: .declarative-okta
version: 1.0.0
metadata:
  displayName: Okta
  description: Test Okta connector
  minimumLicense: enterprise
  supportedFeatureIds: [workflows]
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
export const LIVE_ABUSEIPDB_1_1_0_YAML = liveFixture('abuseipdb_1.1.0.yaml');
export const LIVE_ABUSEIPDB_1_0_0_YAML = liveFixture('abuseipdb_1.0.0.yaml');
export const LIVE_ABUSEIPDB_ICON = liveFixture('abuseipdb_1.1.0.svg');
export const LIVE_OKTA_1_0_0_YAML = liveFixture('okta_1.0.0.yaml');

export const LIVE_CATALOG_PATHS = {
  manifest: '/catalog.json',
  abuseipdbDefinition: '/connectors/abuseipdb/1.1.0.yaml',
  abuseipdbPublishedDefinition: '/connectors/abuseipdb/1.0.0.yaml',
  abuseipdbIcon: '/connectors/abuseipdb/1.1.0.svg',
  oktaDefinition: '/connectors/okta/1.0.0.yaml',
} as const;

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
    [LIVE_CATALOG_PATHS.abuseipdbDefinition]: { body: LIVE_ABUSEIPDB_1_1_0_YAML },
    [LIVE_CATALOG_PATHS.abuseipdbPublishedDefinition]: { body: LIVE_ABUSEIPDB_1_0_0_YAML },
    [LIVE_CATALOG_PATHS.abuseipdbIcon]: { body: LIVE_ABUSEIPDB_ICON },
    [LIVE_CATALOG_PATHS.oktaDefinition]: { body: LIVE_OKTA_1_0_0_YAML },
    ...overrides,
  });
