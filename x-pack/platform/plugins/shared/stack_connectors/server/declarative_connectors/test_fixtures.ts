/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CONNECTOR_ICON_FIXTURE =
  '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1H0z"/></svg>';

export const ABUSE_IPDB_SPEC_FIXTURE = `
schemaVersion: 1
id: .declarative-abuseipdb
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
  type: api_key_header
  header: Key
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
  type: api_key_header
  header: Authorization
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
