/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Entity classes selectable for a custom (user-authored) regex pattern.
 *
 * This intentionally excludes the NER-only classes (`PER`, `ORG`, `LOC`, `MISC`): NER rules are
 * not managed from this page at all (see the plugin README), so they never appear here.
 */
export const CUSTOM_PATTERN_ENTITY_CLASSES = [
  'EMAIL',
  'IP',
  'URL',
  'HOST_NAME',
  'USER_NAME',
  'CLOUD_ACCOUNT',
  'ENTITY_NAME',
  'RESOURCE_NAME',
  'RESOURCE_ID',
] as const;

export type CustomPatternEntityClass = (typeof CUSTOM_PATTERN_ENTITY_CLASSES)[number];

/** Sample values used to render a realistic "example output" for built-in patterns. */
export const SAMPLE_VALUES_BY_ENTITY_CLASS: Record<string, string> = {
  EMAIL: 'jane.doe@example.com',
  IP: '203.0.113.42',
  URL: 'https://example.com/path',
  HOST_NAME: 'web-01.prod.example.com',
  USER_NAME: 'CORP\\j.doe',
  CLOUD_ACCOUNT: '123456789012',
  ENTITY_NAME: 'Example Entity',
  RESOURCE_NAME: 'example-resource',
  RESOURCE_ID: 'EMP-123456',
};
