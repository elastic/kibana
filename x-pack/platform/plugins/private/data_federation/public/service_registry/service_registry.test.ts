/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataFedServiceConfig } from './service_registry';
import { ServiceRegistry } from './service_registry';
import { getS3ServiceConfig } from './s3_service';
import { getGcsServiceConfig } from './gcs_service';
import { getAzureServiceConfig } from './azure_service';

describe('ServiceRegistry', () => {
  it('returns registered service configs in registration order', () => {
    const registry = new ServiceRegistry();
    registry.register(getS3ServiceConfig(true));
    registry.register(getGcsServiceConfig(false));
    registry.register(getAzureServiceConfig(true));

    expect(registry.getAll().map(({ name, enabled }) => ({ name, enabled }))).toEqual([
      { name: 's3', enabled: true },
      { name: 'gcs', enabled: false },
      { name: 'azure', enabled: true },
    ]);
  });

  it('looks up a service config by name', () => {
    const registry = new ServiceRegistry();
    const s3Config: DataFedServiceConfig = getS3ServiceConfig(false);
    registry.register(s3Config);

    expect(registry.get('s3')).toBe(s3Config);
    expect(registry.get('gcs')).toBeUndefined();
  });

  it('reports whether a service is registered', () => {
    const registry = new ServiceRegistry();
    registry.register(getS3ServiceConfig(true));

    expect(registry.has('s3')).toBe(true);
    expect(registry.has('gcs')).toBe(false);
  });

  it('throws when a service is registered twice', () => {
    const registry = new ServiceRegistry();
    registry.register(getS3ServiceConfig(true));

    expect(() => registry.register(getS3ServiceConfig(false))).toThrow(
      'Service "s3" is already registered'
    );
  });
});

describe('service definitions', () => {
  it('returns each type its auth options when federated identity is disabled', () => {
    expect(
      getS3ServiceConfig(true)
        .authOptions(false)
        .map(({ value }) => value)
    ).toEqual(['access_and_secret_keys', 'anonymous']);
    expect(
      getGcsServiceConfig(true)
        .authOptions(false)
        .map(({ value }) => value)
    ).toEqual(['access_and_secret_keys', 'anonymous']);
    expect(
      getAzureServiceConfig(true)
        .authOptions(false)
        .map(({ value }) => value)
    ).toEqual(['credentials', 'anonymous']);
  });

  it('lists Federated Identity first when federated identity is enabled', () => {
    expect(
      getS3ServiceConfig(true)
        .authOptions(true)
        .map(({ value }) => value)
    ).toEqual(['federated_identity', 'access_and_secret_keys', 'anonymous']);
    expect(
      getGcsServiceConfig(true)
        .authOptions(true)
        .map(({ value }) => value)
    ).toEqual(['federated_identity', 'access_and_secret_keys', 'anonymous']);
    expect(
      getAzureServiceConfig(true)
        .authOptions(true)
        .map(({ value }) => value)
    ).toEqual(['federated_identity', 'credentials', 'anonymous']);
  });

  it('does not accumulate Federated Identity across calls', () => {
    const s3 = getS3ServiceConfig(true);
    s3.authOptions(true);
    s3.authOptions(true);

    expect(s3.authOptions(false).map(({ value }) => value)).toEqual([
      'access_and_secret_keys',
      'anonymous',
    ]);
  });

  const allAuthOptions = [getS3ServiceConfig, getGcsServiceConfig, getAzureServiceConfig].map(
    (getServiceConfig) => getServiceConfig(true).authOptions(true)
  );

  it('marks only Federated Identity as recommended', () => {
    for (const options of allAuthOptions) {
      expect(options.filter(({ recommended }) => recommended).map(({ value }) => value)).toEqual([
        'federated_identity',
      ]);
    }
  });

  it('gives every option a description', () => {
    for (const options of allAuthOptions) {
      expect(options.every(({ description }) => description.length > 0)).toBe(true);
    }
  });

  it('flags only anonymous as having no auth fields', () => {
    for (const options of allAuthOptions) {
      expect(
        options.filter(({ hasAuthFields }) => !hasAuthFields).map(({ value }) => value)
      ).toEqual(['anonymous']);
    }
  });
});
