/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_INTEGRATION_NAME_LENGTH,
  getDescriptionError,
  getIntegrationNameError,
  supportsIntegrationSettings,
} from './integration_settings';

describe('getIntegrationNameError', () => {
  it('requires a name', () => {
    expect(getIntegrationNameError('')).toBeDefined();
    expect(getIntegrationNameError('   ')).toBeDefined();
  });

  it('accepts a name up to the limit', () => {
    expect(getIntegrationNameError('a'.repeat(MAX_INTEGRATION_NAME_LENGTH))).toBeUndefined();
  });

  it('rejects a longer name, which would not fit Fleet once suffixed', () => {
    expect(getIntegrationNameError('a'.repeat(MAX_INTEGRATION_NAME_LENGTH + 1))).toBeDefined();
  });
});

describe('getDescriptionError', () => {
  it('allows an empty description', () => {
    expect(getDescriptionError('')).toBeUndefined();
  });

  it('rejects a description over the Fleet limit', () => {
    expect(getDescriptionError('a'.repeat(MAX_DESCRIPTION_LENGTH))).toBeUndefined();
    expect(getDescriptionError('a'.repeat(MAX_DESCRIPTION_LENGTH + 1))).toBeDefined();
  });
});

describe('supportsIntegrationSettings', () => {
  const service = (methods: string[]) =>
    ({
      deploymentMethods: methods.map((method) => ({ method })),
    } as unknown as AwsServiceMatrixEntry);

  it('is false for ECF-only services, which create no package policy', () => {
    expect(supportsIntegrationSettings(service(['ecf']))).toBe(false);
  });

  it('is true for ECF-only services in agent-based mode, which deploys them as policies', () => {
    expect(supportsIntegrationSettings(service(['ecf']), 'agent_based')).toBe(true);
    expect(supportsIntegrationSettings(service(['ecf']), 'managed_integration')).toBe(false);
  });

  it('is true when a service can be deployed as a policy', () => {
    expect(supportsIntegrationSettings(service(['ecf', 'managed_integration']))).toBe(true);
    expect(supportsIntegrationSettings(service(['agent_based']))).toBe(true);
  });
});
