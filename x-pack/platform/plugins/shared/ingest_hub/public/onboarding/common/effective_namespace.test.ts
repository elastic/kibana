/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../aws_service_matrix';
import { deploysAsPolicy, getEffectiveNamespace } from './effective_namespace';

describe('getEffectiveNamespace', () => {
  it('prefers the instance namespace over the global one', () => {
    expect(
      getEffectiveNamespace('ec2__dup-1', { 'ec2__dup-1': { namespace: 'prod' } }, 'global')
    ).toBe('prod');
  });

  it('falls back to the global namespace', () => {
    expect(getEffectiveNamespace('ec2', {}, 'global')).toBe('global');
    expect(getEffectiveNamespace('ec2', { ec2: { namespace: '' } }, 'global')).toBe('global');
  });

  it('is empty when neither is set', () => {
    expect(getEffectiveNamespace('ec2', {})).toBe('');
  });
});

describe('deploysAsPolicy', () => {
  const service = (deploymentMethods: unknown[]) =>
    ({ deploymentMethods } as unknown as AwsServiceMatrixEntry);

  it('is true for every service under agent-based', () => {
    expect(deploysAsPolicy(service([{ method: 'ecf' }]), 'agent_based')).toBe(true);
  });

  it('is true under managed integration for a service that prefers it', () => {
    expect(
      deploysAsPolicy(
        service([{ method: 'managed_integration', preferred: true }, { method: 'ecf' }]),
        'managed_integration'
      )
    ).toBe(true);
  });

  it('is false for an ECF service under managed integration', () => {
    expect(deploysAsPolicy(service([{ method: 'ecf' }]), 'managed_integration')).toBe(false);
    expect(
      deploysAsPolicy(service([{ method: 'managed_integration' }]), 'managed_integration')
    ).toBe(false);
  });
});
