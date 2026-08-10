/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { classifyFields, resolveAuthType } from './field_classification';

const baseMetadata: ConnectorSpec['metadata'] = {
  id: '.fake_connector',
  displayName: 'Fake connector',
  description: 'A fake connector spec used for tests.',
  minimumLicense: 'basic',
  supportedFeatureIds: [],
};

const specWithNoAuth: ConnectorSpec = {
  metadata: baseMetadata,
  schema: z.object({ region: z.string(), subscriptionId: z.string() }),
  actions: {},
  test: { handler: async () => ({}), enabled: true },
};

const specWithOneAuthType: ConnectorSpec = {
  ...specWithNoAuth,
  auth: { types: ['basic'] },
};

const specWithMultipleAuthTypes: ConnectorSpec = {
  ...specWithNoAuth,
  auth: { types: ['basic', 'oauth_client_credentials'] },
};

const specWithAmbiguousNames: ConnectorSpec = {
  ...specWithNoAuth,
  schema: z.object({ region: z.string(), username: z.string() }), // 'username' also in `basic`
  auth: { types: ['basic'] },
};

describe('resolveAuthType', () => {
  it('returns undefined and accepts an omitted authType when the spec has zero auth types', () => {
    expect(resolveAuthType(specWithNoAuth, '.fake_connector', undefined)).toBeUndefined();
  });

  it('fails fast when authType is provided but the spec has zero auth types', () => {
    expect(() => resolveAuthType(specWithNoAuth, '.fake_connector', 'basic')).toThrow(
      /has no authentication types; omit authType/
    );
  });

  it('defaults to the single auth type when authType is omitted', () => {
    expect(resolveAuthType(specWithOneAuthType, '.fake_connector', undefined)).toBe('basic');
  });

  it('accepts the single auth type when explicitly provided and matching', () => {
    expect(resolveAuthType(specWithOneAuthType, '.fake_connector', 'basic')).toBe('basic');
  });

  it('fails fast when authType is provided but does not match the single auth type', () => {
    expect(() =>
      resolveAuthType(specWithOneAuthType, '.fake_connector', 'oauth_client_credentials')
    ).toThrow(/is not valid/);
  });

  it('requires authType when the spec has multiple auth types', () => {
    expect(() => resolveAuthType(specWithMultipleAuthTypes, '.fake_connector', undefined)).toThrow(
      /authType is required/
    );
  });

  it('fails fast when authType does not match any of multiple auth types', () => {
    expect(() => resolveAuthType(specWithMultipleAuthTypes, '.fake_connector', 'bearer')).toThrow(
      /is not valid/
    );
  });

  it('resolves a valid authType among multiple auth types', () => {
    expect(
      resolveAuthType(specWithMultipleAuthTypes, '.fake_connector', 'oauth_client_credentials')
    ).toBe('oauth_client_credentials');
  });
});

describe('classifyFields', () => {
  it('classifies config fields from schema and secret fields from the resolved auth type', () => {
    const result = classifyFields(specWithOneAuthType, '.fake_connector', 'basic');
    expect(result.configFieldNames.sort()).toEqual(['region', 'subscriptionId'].sort());
    expect(result.secretFieldNames.sort()).toEqual(['username', 'password'].sort());
    expect(result.allFieldNames).toEqual(
      new Set(['region', 'subscriptionId', 'username', 'password'])
    );
  });

  it('returns an empty secretFieldNames list when authType is undefined', () => {
    const result = classifyFields(specWithNoAuth, '.fake_connector', undefined);
    expect(result.secretFieldNames).toEqual([]);
  });

  it('excludes the authType discriminator key from secretFieldNames', () => {
    const result = classifyFields(specWithOneAuthType, '.fake_connector', 'basic');
    expect(result.secretFieldNames).not.toContain('authType');
  });

  it('fails fast on an ambiguous name shared between config and secrets schemas (guarantee 3)', () => {
    expect(() => classifyFields(specWithAmbiguousNames, '.fake_connector', 'basic')).toThrow(
      /internal field-classification conflict.*username/
    );
  });
});
