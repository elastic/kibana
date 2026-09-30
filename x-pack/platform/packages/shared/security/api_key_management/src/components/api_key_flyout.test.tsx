/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiKeyFormValues } from './api_key_flyout';
import { mapCreateApiKeyValues, mapUpdateApiKeyValues } from './api_key_flyout';

const baseValues: ApiKeyFormValues = {
  name: 'my-key',
  type: 'cross_cluster',
  expiration: '',
  customExpiration: false,
  customPrivileges: false,
  includeMetadata: false,
  includeCertificateIdentity: false,
  access: JSON.stringify({ search: [{ names: ['*'] }] }),
  role_descriptors: '{}',
  metadata: '{}',
  certificateIdentity: '',
};

describe('mapCreateApiKeyValues', () => {
  it('includes `certificate_identity` for cross-cluster keys when the toggle is enabled', () => {
    const result = mapCreateApiKeyValues({
      ...baseValues,
      includeCertificateIdentity: true,
      certificateIdentity: 'CN=host,OU=engineering,DC=example,DC=com',
    });

    expect(result).toMatchObject({
      type: 'cross_cluster',
      name: 'my-key',
      certificate_identity: 'CN=host,OU=engineering,DC=example,DC=com',
    });
  });

  it('omits `certificate_identity` when the toggle is disabled', () => {
    const result = mapCreateApiKeyValues(baseValues) as Extract<
      ReturnType<typeof mapCreateApiKeyValues>,
      { type: 'cross_cluster' }
    >;

    expect(result.certificate_identity).toBeUndefined();
  });

  it('does not include `certificate_identity` for REST keys', () => {
    const result = mapCreateApiKeyValues({
      ...baseValues,
      type: 'rest',
      includeCertificateIdentity: true,
      certificateIdentity: 'CN=host',
    });

    expect(result).not.toHaveProperty('certificate_identity');
  });
});

describe('mapUpdateApiKeyValues', () => {
  it('includes `certificate_identity` for cross-cluster keys when the toggle is enabled', () => {
    const result = mapUpdateApiKeyValues(
      'cross_cluster',
      '123',
      {
        ...baseValues,
        includeCertificateIdentity: true,
        certificateIdentity: 'CN=host,OU=engineering,DC=example,DC=com',
      },
      baseValues
    );

    expect(result).toMatchObject({
      type: 'cross_cluster',
      id: '123',
      certificate_identity: 'CN=host,OU=engineering,DC=example,DC=com',
    });
    expect(result).not.toHaveProperty('expiration');
  });

  it('sends `certificate_identity: null` to clear a previously set value when disabled', () => {
    const result = mapUpdateApiKeyValues(
      'cross_cluster',
      '123',
      {
        ...baseValues,
        includeCertificateIdentity: false,
      },
      {
        ...baseValues,
        includeCertificateIdentity: true,
        certificateIdentity: 'CN=host',
      }
    ) as Extract<ReturnType<typeof mapUpdateApiKeyValues>, { type: 'cross_cluster' }>;

    expect(result.certificate_identity).toBeNull();
  });

  it('omits `certificate_identity` when it was never set and remains disabled', () => {
    const result = mapUpdateApiKeyValues(
      'cross_cluster',
      '123',
      { ...baseValues, includeCertificateIdentity: false },
      { ...baseValues, includeCertificateIdentity: false }
    ) as Extract<ReturnType<typeof mapUpdateApiKeyValues>, { type: 'cross_cluster' }>;

    expect(result.certificate_identity).toBeUndefined();
  });
});
