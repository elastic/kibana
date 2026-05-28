/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';

import { computeRequiredStacks, getPrimaryMethod } from './compute_required_stacks';

const makeService = (
  overrides: Partial<AwsServiceMatrixEntry> & Pick<AwsServiceMatrixEntry, 'id' | 'deliveryMethods'>
): AwsServiceMatrixEntry => ({
  name: overrides.id,
  category: 'Security',
  signalType: 'logs',
  packageName: 'aws',
  defaultEnabled: true,
  showInUI: true,
  ...overrides,
});

describe('getPrimaryMethod', () => {
  it('returns the first method when none is preferred', () => {
    const entry = makeService({
      id: 'svc',
      deliveryMethods: [{ method: 'agentless' }, { method: 'firehose' }],
    });
    expect(getPrimaryMethod(entry)).toBe('agentless');
  });

  it('returns the preferred method when set', () => {
    const entry = makeService({
      id: 'svc',
      deliveryMethods: [
        { method: 'agentless' },
        { method: 'cloud_forwarder', preferred: true },
        { method: 'firehose' },
      ],
    });
    expect(getPrimaryMethod(entry)).toBe('cloud_forwarder');
  });

  it('returns the only method for single-entry', () => {
    const entry = makeService({
      id: 'svc',
      deliveryMethods: [{ method: 'firehose' }],
    });
    expect(getPrimaryMethod(entry)).toBe('firehose');
  });
});

describe('computeRequiredStacks', () => {
  const agentlessSvc = makeService({
    id: 'cloudtrail',
    deliveryMethods: [{ method: 'agentless' }],
  });
  const firehoseSvc = makeService({
    id: 'firewall_logs',
    deliveryMethods: [{ method: 'firehose' }],
  });
  const cfSvc = makeService({
    id: 'cloudfront_logs',
    deliveryMethods: [{ method: 'cloud_forwarder' }],
  });
  const multiSvc = makeService({
    id: 'vpcflow',
    deliveryMethods: [
      { method: 'agentless' },
      { method: 'cloud_forwarder' },
      { method: 'firehose' },
    ],
  });

  it('returns empty array when no services selected', () => {
    const result = computeRequiredStacks({
      selectedServices: [],
      serviceVars: {},
      authType: 'identity_federation',
      isNewConnection: true,
    });
    expect(result).toEqual([]);
  });

  describe('Identity Federation stack', () => {
    it('is included when authType=identity_federation, isNewConnection=true, and agentless services present', () => {
      const result = computeRequiredStacks({
        selectedServices: [agentlessSvc],
        serviceVars: { cloudtrail: [{ regions: ['us-east-1'] }] },
        authType: 'identity_federation',
        isNewConnection: true,
      });
      expect(result).toHaveLength(1);
      expect(result[0].mechanism).toBe('identity_federation');
      expect(result[0].services).toEqual([agentlessSvc]);
      expect(result[0].serviceVars).toEqual({ cloudtrail: [{ regions: ['us-east-1'] }] });
    });

    it('is skipped when authType=static_keys', () => {
      const result = computeRequiredStacks({
        selectedServices: [agentlessSvc],
        serviceVars: {},
        authType: 'static_keys',
        isNewConnection: true,
      });
      expect(result).toEqual([]);
    });

    it('is skipped when isNewConnection=false', () => {
      const result = computeRequiredStacks({
        selectedServices: [agentlessSvc],
        serviceVars: {},
        authType: 'identity_federation',
        isNewConnection: false,
      });
      expect(result).toEqual([]);
    });

    it('is skipped when no agentless-primary services present', () => {
      const result = computeRequiredStacks({
        selectedServices: [firehoseSvc],
        serviceVars: {},
        authType: 'identity_federation',
        isNewConnection: true,
      });
      expect(result).toHaveLength(1);
      expect(result[0].mechanism).toBe('firehose');
    });
  });

  describe('Firehose stack', () => {
    it('is included when firehose-primary services are present', () => {
      const result = computeRequiredStacks({
        selectedServices: [firehoseSvc],
        serviceVars: {},
        authType: 'static_keys',
        isNewConnection: false,
      });
      expect(result).toHaveLength(1);
      expect(result[0].mechanism).toBe('firehose');
      expect(result[0].services).toEqual([firehoseSvc]);
    });

    it('is excluded when no firehose-primary services', () => {
      const result = computeRequiredStacks({
        selectedServices: [cfSvc],
        serviceVars: {},
        authType: 'static_keys',
        isNewConnection: false,
      });
      expect(result).toHaveLength(1);
      expect(result[0].mechanism).toBe('cloud_forwarder');
    });
  });

  describe('Cloud Forwarder stack', () => {
    it('is included when cloud_forwarder-primary services are present', () => {
      const result = computeRequiredStacks({
        selectedServices: [cfSvc],
        serviceVars: { cloudfront_logs: [{ bucket_arn: 'arn:aws:s3:::my-bucket' }] },
        authType: 'static_keys',
        isNewConnection: false,
      });
      expect(result).toHaveLength(1);
      expect(result[0].mechanism).toBe('cloud_forwarder');
      expect(result[0].serviceVars).toEqual({
        cloudfront_logs: [{ bucket_arn: 'arn:aws:s3:::my-bucket' }],
      });
    });
  });

  describe('ordering and grouping', () => {
    it('returns stacks in IF -> Firehose -> CF order regardless of input order', () => {
      const result = computeRequiredStacks({
        selectedServices: [cfSvc, firehoseSvc, agentlessSvc],
        serviceVars: {},
        authType: 'identity_federation',
        isNewConnection: true,
      });
      expect(result).toHaveLength(3);
      expect(result[0].mechanism).toBe('identity_federation');
      expect(result[1].mechanism).toBe('firehose');
      expect(result[2].mechanism).toBe('cloud_forwarder');
    });

    it('assigns multi-method service to its primary (first) method only', () => {
      const result = computeRequiredStacks({
        selectedServices: [multiSvc],
        serviceVars: {},
        authType: 'identity_federation',
        isNewConnection: true,
      });
      expect(result).toHaveLength(1);
      expect(result[0].mechanism).toBe('identity_federation');
      expect(result[0].services).toEqual([multiSvc]);
    });

    it('assigns multi-method service with preferred to the preferred method', () => {
      const preferred = makeService({
        id: 'vpcflow_pref',
        deliveryMethods: [
          { method: 'agentless' },
          { method: 'cloud_forwarder', preferred: true },
          { method: 'firehose' },
        ],
      });
      const result = computeRequiredStacks({
        selectedServices: [preferred],
        serviceVars: {},
        authType: 'static_keys',
        isNewConnection: false,
      });
      expect(result).toHaveLength(1);
      expect(result[0].mechanism).toBe('cloud_forwarder');
      expect(result[0].services).toEqual([preferred]);
    });

    it('no service appears in multiple stacks', () => {
      const result = computeRequiredStacks({
        selectedServices: [agentlessSvc, firehoseSvc, cfSvc, multiSvc],
        serviceVars: {},
        authType: 'identity_federation',
        isNewConnection: true,
      });
      const allServiceIds = result.flatMap((s) => s.services.map((svc) => svc.id));
      expect(new Set(allServiceIds).size).toBe(allServiceIds.length);
    });
  });

  describe('serviceVars partitioning', () => {
    it('partitions serviceVars per stack', () => {
      const result = computeRequiredStacks({
        selectedServices: [agentlessSvc, firehoseSvc],
        serviceVars: {
          cloudtrail: [{ regions: ['us-east-1'] }],
          firewall_logs: [{ bucket_arn: 'arn:aws:s3:::fw-bucket' }],
        },
        authType: 'identity_federation',
        isNewConnection: true,
      });
      expect(result).toHaveLength(2);
      expect(result[0].serviceVars).toEqual({ cloudtrail: [{ regions: ['us-east-1'] }] });
      expect(result[1].serviceVars).toEqual({
        firewall_logs: [{ bucket_arn: 'arn:aws:s3:::fw-bucket' }],
      });
    });

    it('omits service from vars when no vars provided for that service', () => {
      const result = computeRequiredStacks({
        selectedServices: [agentlessSvc],
        serviceVars: {},
        authType: 'identity_federation',
        isNewConnection: true,
      });
      expect(result[0].serviceVars).toEqual({});
    });
  });

  describe('all services same mechanism', () => {
    it('produces a single stack', () => {
      const svc2 = makeService({
        id: 'ec2_metrics',
        deliveryMethods: [{ method: 'agentless' }],
      });
      const result = computeRequiredStacks({
        selectedServices: [agentlessSvc, svc2],
        serviceVars: {},
        authType: 'identity_federation',
        isNewConnection: true,
      });
      expect(result).toHaveLength(1);
      expect(result[0].services).toHaveLength(2);
    });
  });
});
