/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../aws_service_matrix';
import {
  deploysAsPolicy,
  followsGlobalNamespace,
  getEcfStackNamespace,
  getEffectiveNamespace,
} from './effective_namespace';

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

describe('getEcfStackNamespace', () => {
  const ecfService = (fields: Record<string, unknown> = {}) =>
    ({
      deploymentMethods: [{ method: 'ecf' }],
      ecfLogType: 'cloudtrail',
      ...fields,
    } as unknown as AwsServiceMatrixEntry);

  it('is the namespace the unified stack was launched with', () => {
    expect(
      getEcfStackNamespace(ecfService(), [
        { family: 'otel' },
        { family: 'unified', namespace: 'prod' },
      ])
    ).toBe('prod');
  });

  it('is the template default before the stack is launched or when it has no namespace', () => {
    expect(getEcfStackNamespace(ecfService())).toBe('default');
    expect(getEcfStackNamespace(ecfService(), [{ family: 'unified' }])).toBe('default');
  });

  it('is undefined for the OTel and CrowdStrike templates, which take no namespace', () => {
    expect(getEcfStackNamespace(ecfService({ ecfDedicatedTemplate: 'otel' }))).toBeUndefined();
    expect(
      getEcfStackNamespace(ecfService({ ecfDedicatedTemplate: 'crowdstrike_fdr' }))
    ).toBeUndefined();
  });

  it('is undefined for a service that does not deploy through ECF', () => {
    expect(
      getEcfStackNamespace({ deploymentMethods: [] } as unknown as AwsServiceMatrixEntry)
    ).toBeUndefined();
  });
});

describe('followsGlobalNamespace', () => {
  const ecfService = (fields: Record<string, unknown> = {}) =>
    ({
      deploymentMethods: [{ method: 'ecf' }],
      ecfLogType: 'cloudtrail',
      ...fields,
    } as unknown as AwsServiceMatrixEntry);

  it('is true for a service deployed as a policy', () => {
    expect(followsGlobalNamespace(ecfService(), 'agent_based')).toBe(true);
  });

  it('is true for a service on the unified ECF template', () => {
    expect(followsGlobalNamespace(ecfService(), 'managed_integration')).toBe(true);
  });

  it('is false for services on the OTel and CrowdStrike templates', () => {
    expect(
      followsGlobalNamespace(ecfService({ ecfDedicatedTemplate: 'otel' }), 'managed_integration')
    ).toBe(false);
    expect(
      followsGlobalNamespace(
        ecfService({ ecfDedicatedTemplate: 'crowdstrike_fdr' }),
        'managed_integration'
      )
    ).toBe(false);
  });
});
