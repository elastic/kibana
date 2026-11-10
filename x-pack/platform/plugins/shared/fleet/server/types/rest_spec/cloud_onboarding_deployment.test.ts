/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CloudOnboardingDeploymentSchemaV4,
  CloudOnboardingDeploymentSchemaV5,
  CloudOnboardingDeploymentSchemaV6,
  CloudOnboardingDeploymentSchemaV7,
  CloudOnboardingDeploymentSchemaV9,
} from '../models';

import {
  CreateCloudOnboardingDeploymentRequestSchema,
  UpdateCloudOnboardingDeploymentRequestSchema,
} from './cloud_onboarding_deployment';

const original = {
  instanceId: 'cloudtrail',
  serviceId: 'cloudtrail',
  name: 'AWS CloudTrail',
  isDuplicate: false,
};
const duplicate = {
  instanceId: 'cloudtrail__dup-1',
  serviceId: 'cloudtrail',
  name: 'CloudTrail prod',
  isDuplicate: true,
};

const createBody = (extra: Record<string, unknown> = {}) => ({
  provider: 'aws',
  authMethod: 'static_keys',
  mechanisms: ['managed_integration'],
  services: ['cloudtrail'],
  ...extra,
});

const manyInstances = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ ...duplicate, instanceId: `cloudtrail__dup-${i}` }));

describe.each([
  [
    'create request',
    (instances: unknown) =>
      CreateCloudOnboardingDeploymentRequestSchema.body.validate(createBody({ instances })),
  ],
  [
    'update request',
    (instances: unknown) =>
      UpdateCloudOnboardingDeploymentRequestSchema.body.validate({ instances }),
  ],
])('instances in the %s', (_name, validate) => {
  it('accepts originals and duplicates', () => {
    expect(validate([original, duplicate])).toEqual(
      expect.objectContaining({ instances: [original, duplicate] })
    );
  });

  it('accepts an id and name of exactly 255 characters', () => {
    expect(() =>
      validate([{ ...original, instanceId: 'a'.repeat(255), name: 'n'.repeat(255) }])
    ).not.toThrow();
  });

  it('accepts exactly 1000 instances', () => {
    expect(() => validate(manyInstances(1000))).not.toThrow();
  });

  it('rejects more than 1000 instances', () => {
    expect(() => validate(manyInstances(1001))).toThrow();
  });

  it('rejects an instance without an instanceId or a serviceId', () => {
    const { instanceId, ...withoutInstanceId } = original;
    const { serviceId, ...withoutServiceId } = original;

    expect(() => validate([withoutInstanceId])).toThrow();
    expect(() => validate([withoutServiceId])).toThrow();
  });

  it('rejects an empty instanceId', () => {
    expect(() => validate([{ ...original, instanceId: '' }])).toThrow();
  });

  it('rejects an id or name over 255 characters', () => {
    expect(() => validate([{ ...original, instanceId: 'a'.repeat(256) }])).toThrow();
    expect(() => validate([{ ...original, serviceId: 'a'.repeat(256) }])).toThrow();
    expect(() => validate([{ ...original, name: 'n'.repeat(256) }])).toThrow();
  });

  it('rejects an isDuplicate that is not a boolean', () => {
    expect(() => validate([{ ...original, isDuplicate: 'yes' }])).toThrow();
  });

  it('rejects instances that are not an array', () => {
    expect(() => validate(original)).toThrow();
  });
});

describe('instances are optional', () => {
  it('on create', () => {
    expect(() =>
      CreateCloudOnboardingDeploymentRequestSchema.body.validate(createBody())
    ).not.toThrow();
  });

  it('on update', () => {
    expect(() =>
      UpdateCloudOnboardingDeploymentRequestSchema.body.validate({ status: 'deploying' })
    ).not.toThrow();
  });
});

describe('ecfStacks namespace', () => {
  const stack = { family: 'unified', stackName: 'edot-cloud-forwarder', templateVersion: '1.10.0' };
  const validateStacks = (ecfStacks: unknown) =>
    UpdateCloudOnboardingDeploymentRequestSchema.body.validate({ ecfStacks });

  it('accepts a stack with a namespace', () => {
    expect(validateStacks([{ ...stack, namespace: 'prod' }])).toEqual({
      ecfStacks: [expect.objectContaining({ namespace: 'prod' })],
    });
  });

  it('accepts a stack without a namespace', () => {
    expect(() => validateStacks([stack])).not.toThrow();
  });

  it('rejects an empty namespace or one over 100 characters', () => {
    expect(() => validateStacks([{ ...stack, namespace: '' }])).toThrow();
    expect(() => validateStacks([{ ...stack, namespace: 'a'.repeat(101) }])).toThrow();
  });

  it('is stored by the saved object model', () => {
    expect(
      CloudOnboardingDeploymentSchemaV5.validate({
        provider: 'aws',
        mechanisms: ['ecf'],
        services: ['cloudtrail'],
        status: 'succeeded',
        attemptCount: 1,
        ecfStacks: [{ ...stack, namespace: 'prod' }],
      })
    ).toEqual(expect.objectContaining({ ecfStacks: [{ ...stack, namespace: 'prod' }] }));
  });
});

describe('saved object model versions', () => {
  const record = {
    provider: 'aws',
    mechanisms: ['agent_based'],
    services: ['cloudtrail'],
    status: 'succeeded',
    attemptCount: 1,
  };

  it('V5 stores the instances', () => {
    expect(
      CloudOnboardingDeploymentSchemaV5.validate({ ...record, instances: [original, duplicate] })
    ).toEqual(expect.objectContaining({ instances: [original, duplicate] }));
  });

  it('V5 still accepts a record without instances, as saved by V4', () => {
    expect(() => CloudOnboardingDeploymentSchemaV5.validate(record)).not.toThrow();
  });

  it('V5 keeps the namespace of V4', () => {
    expect(
      CloudOnboardingDeploymentSchemaV5.validate({ ...record, namespace: 'prod', instances: [] })
    ).toEqual(expect.objectContaining({ namespace: 'prod' }));
  });

  it('V4 does not know the instances, which is why the new field needs its own model version', () => {
    expect(() =>
      CloudOnboardingDeploymentSchemaV4.validate({ ...record, instances: [original] })
    ).toThrow();
  });

  it('V5 reads a document from a newer version, ignoring fields it does not know', () => {
    const forwardCompatible = CloudOnboardingDeploymentSchemaV5.extends({}, { unknowns: 'ignore' });

    expect(forwardCompatible.validate({ ...record, somethingNewer: true })).not.toHaveProperty(
      'somethingNewer'
    );
  });

  it('V7 stores the package policy settings', () => {
    expect(
      CloudOnboardingDeploymentSchemaV7.validate({
        ...record,
        policySettings: { output_id: 'logstash-1' },
      })
    ).toEqual(expect.objectContaining({ policySettings: { output_id: 'logstash-1' } }));
  });

  it('V7 rejects package policy settings that are not short strings', () => {
    for (const policySettings of [
      { output_id: { nested: 'object' } },
      { output_id: 1 },
      { output_id: 'x'.repeat(1025) },
      { ['k'.repeat(257)]: 'value' },
      Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`setting_${i}`, 'value'])),
    ]) {
      expect(() =>
        CloudOnboardingDeploymentSchemaV7.validate({ ...record, policySettings })
      ).toThrow();
    }
  });

  it('V7 accepts a package policy setting cleared back to its default', () => {
    expect(() =>
      CloudOnboardingDeploymentSchemaV7.validate({ ...record, policySettings: { output_id: null } })
    ).not.toThrow();
  });

  it('V9 stores a package policy setting as long as a condition', () => {
    const policySettings = { condition: 'x'.repeat(10000) };
    expect(CloudOnboardingDeploymentSchemaV9.validate({ ...record, policySettings })).toEqual(
      expect.objectContaining({ policySettings })
    );
    expect(() =>
      CloudOnboardingDeploymentSchemaV9.validate({
        ...record,
        policySettings: { condition: 'x'.repeat(10001) },
      })
    ).toThrow();
  });

  it('V7 rejects a setting longer than 1024 characters, which is why the longer limit needs its own model version', () => {
    expect(() =>
      CloudOnboardingDeploymentSchemaV7.validate({
        ...record,
        policySettings: { condition: 'x'.repeat(1025) },
      })
    ).toThrow();
  });

  it('V6 does not know the package policy settings, which is why they need their own model version', () => {
    expect(() =>
      CloudOnboardingDeploymentSchemaV6.validate({
        ...record,
        policySettings: { output_id: 'logstash-1' },
      })
    ).toThrow();
  });
});

describe('policySettings in requests', () => {
  it('rejects settings that are not short strings, or too many of them', () => {
    const tooMany = Object.fromEntries(
      Array.from({ length: 21 }, (_, i) => [`setting_${i}`, 'value'])
    );
    for (const policySettings of [
      { output_id: { nested: 'object' } },
      { output_id: 1 },
      { condition: 'x'.repeat(10001) },
      tooMany,
    ]) {
      expect(() =>
        CreateCloudOnboardingDeploymentRequestSchema.body.validate(createBody({ policySettings }))
      ).toThrow();
      expect(() =>
        UpdateCloudOnboardingDeploymentRequestSchema.body.validate({ policySettings })
      ).toThrow();
    }
  });

  it('accepts package policy settings on create and update', () => {
    const policySettings = { output_id: 'logstash-1', condition: 'x'.repeat(10000) };
    expect(
      CreateCloudOnboardingDeploymentRequestSchema.body.validate(createBody({ policySettings }))
    ).toEqual(expect.objectContaining({ policySettings }));
    expect(UpdateCloudOnboardingDeploymentRequestSchema.body.validate({ policySettings })).toEqual(
      expect.objectContaining({ policySettings })
    );
  });
});
