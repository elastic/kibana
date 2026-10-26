/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceInstance, ServiceVars } from '../service_settings_step/use_service_settings';
import {
  DEFAULT_NAMESPACE,
  deriveGroupPolicyName,
  getBareNamePackage,
  getSourcePolicyName,
  groupByPackage,
} from './deploy_group_helpers';
import { MAX_INTEGRATION_NAME_LENGTH } from '../service_settings_step/integration_settings';
import { planPolicyUpdates } from './plan_policy_updates';

const original = (id: string, packageName = 'aws') => ({
  instance: { instanceId: id, serviceId: id, name: id, isDuplicate: false } as ServiceInstance,
  service: { id, packageName } as AwsServiceMatrixEntry,
});

const withNamespace = (namespace?: string): ServiceVars => ({
  enabledDataStreams: [],
  varsByDataStream: {},
  ...(namespace !== undefined ? { namespace } : {}),
});

describe('groupByPackage — namespaces', () => {
  const originals = [original('elb'), original('s3')];

  describe('managed integrations (an instance without a namespace deploys into the default one)', () => {
    it('puts an instance without a namespace and one that names the default explicitly in one group', () => {
      const groups = groupByPackage(
        originals,
        [],
        { elb: withNamespace(), s3: withNamespace('default') },
        DEFAULT_NAMESPACE
      );

      expect(groups).toHaveLength(1);
      // The plain package id keeps the policy names the same as before.
      expect(groups[0]).toEqual(
        expect.objectContaining({
          groupId: 'aws',
          namespace: 'default',
          instanceIds: ['elb', 's3'],
          policyNameStem: 'aws',
        })
      );
    });

    it('still splits instances in different namespaces', () => {
      const groups = groupByPackage(
        originals,
        [],
        { elb: withNamespace(), s3: withNamespace('prod') },
        DEFAULT_NAMESPACE
      );

      expect(groups.map((g) => [g.groupId, g.namespace])).toEqual([
        ['aws', 'default'],
        ['aws__prod', 'prod'],
      ]);
    });

    it('resolves the namespace of a duplicate too', () => {
      const [group] = groupByPackage(
        [],
        [original('elb__dup-1')],
        { 'elb__dup-1': withNamespace() },
        DEFAULT_NAMESPACE
      );
      expect(group.namespace).toBe('default');
    });

    it('lets a new instance join the policy of a tracked one that has no namespace', () => {
      // elb was deployed without a namespace, s3 is added with the default named explicitly.
      const groups = groupByPackage(
        originals,
        [],
        { elb: withNamespace(), s3: withNamespace('default') },
        DEFAULT_NAMESPACE
      );
      const toDeploy = [{ ...groups[0], instanceIds: ['s3'] }];

      const { createGroups, policyUpdates } = planPolicyUpdates(toDeploy, groups, {
        elb: 'policy-A',
      });

      expect(createGroups).toEqual([]);
      expect(policyUpdates.map((u) => u.policyId)).toEqual(['policy-A']);
    });
  });

  describe('without a default namespace (agent-based: empty means the agent policy namespace)', () => {
    it('keeps an empty namespace and an explicit default apart', () => {
      const groups = groupByPackage(originals, [], {
        elb: withNamespace(),
        s3: withNamespace('default'),
      });

      expect(groups.map((g) => [g.groupId, g.namespace])).toEqual([
        ['aws', ''],
        ['aws__default', 'default'],
      ]);
    });
  });
});

describe('deriveGroupPolicyName', () => {
  // Duplicate instance ids are `<serviceId>__dup-<n>`.
  const duplicate = (id: string, name: string, packageName = 'aws') => {
    const serviceId = id.split('__dup-')[0];
    return {
      instance: { instanceId: id, serviceId, name, isDuplicate: true } as ServiceInstance,
      service: { id: serviceId, packageName } as AwsServiceMatrixEntry,
    };
  };

  const groupsFor = (
    originals: ReturnType<typeof original>[],
    vars: Record<string, ServiceVars> = {},
    duplicates: ReturnType<typeof duplicate>[] = []
  ) => groupByPackage(originals, duplicates, vars, DEFAULT_NAMESPACE);

  it('returns undefined without an integration name, so callers keep their naming', () => {
    const [group] = groupsFor([original('elb')]);
    expect(deriveGroupPolicyName(group, undefined)).toBeUndefined();
    expect(deriveGroupPolicyName(group, '   ')).toBeUndefined();
  });

  it('keeps the name as entered for the main package in the default namespace', () => {
    const [group] = groupsFor([original('elb'), original('s3')]);
    expect(deriveGroupPolicyName(group, '  my-aws ')).toBe('my-aws');
  });

  it('adds the namespace to a main package group in another namespace', () => {
    const groups = groupsFor([original('elb'), original('s3')], { s3: withNamespace('prod') });
    expect(groups.map((g) => deriveGroupPolicyName(g, 'my-aws'))).toEqual([
      'my-aws',
      'my-aws-prod',
    ]);
  });

  it('suffixes the policies of other packages with the package and namespace', () => {
    const groups = groupsFor(
      [original('elb'), original('bedrock', 'aws_bedrock'), original('bedrock2', 'aws_bedrock')],
      { bedrock2: withNamespace('prod') }
    );
    expect(groups.map((g) => deriveGroupPolicyName(g, 'my-aws'))).toEqual([
      'my-aws',
      'my-aws-aws_bedrock',
      'my-aws-aws_bedrock-prod',
    ]);
  });

  it('keeps the service name chosen in the duplicate modal as the policy name', () => {
    const groups = groupsFor([original('elb')], {}, [
      duplicate('elb__dup-1', ' my-aws [Duplicate] '),
    ]);
    expect(deriveGroupPolicyName(groups[1], 'other-name')).toBe('my-aws [Duplicate]');
  });

  it('keeps names unique when sanitizing makes namespaces equal', () => {
    const groups = groupsFor([original('a', 'aws_bedrock'), original('b', 'aws_bedrock')], {
      a: withNamespace('prod.eu'),
      b: withNamespace('prod_eu'),
    });
    const names = groups.map((g) => deriveGroupPolicyName(g, 'my-aws'));
    expect(new Set(names).size).toBe(2);
  });

  it('stays within the Fleet name limit for the longest allowed name, without cutting a suffix', () => {
    const longPackage = 'p'.repeat(100);
    const longNamespace = 'n'.repeat(100);
    const groups = groupsFor(
      [original('a', longPackage), original('b', longPackage), original('c')],
      { a: withNamespace(longNamespace), b: withNamespace(`${longNamespace}x`) }
    );
    const names = groups.map((g) =>
      deriveGroupPolicyName(g, 'x'.repeat(MAX_INTEGRATION_NAME_LENGTH))
    );

    expect(Math.max(...names.map((n) => n!.length))).toBeLessThanOrEqual(255);
    // Two namespaces that only differ after the stem limit still end up with different names.
    expect(new Set(names).size).toBe(groups.length);
  });

  it('never cuts a name that is already within the limit', () => {
    const [group] = groupsFor([original('elb')]);
    expect(deriveGroupPolicyName(group, 'x'.repeat(MAX_INTEGRATION_NAME_LENGTH))).toBe(
      'x'.repeat(MAX_INTEGRATION_NAME_LENGTH)
    );
  });

  describe('when the deploy has a single package', () => {
    it('gives a lone non-aws package the name exactly as entered', () => {
      const [group] = groupsFor([original('bedrock', 'aws_bedrock')]);
      expect(deriveGroupPolicyName(group, 'aws-1-aws_bedrock')).toBe('aws-1-aws_bedrock');
    });

    it('adds only the namespace for another namespace of that package', () => {
      const groups = groupsFor([original('a', 'aws_bedrock'), original('b', 'aws_bedrock')], {
        b: withNamespace('prod'),
      });
      expect(groups.map((g) => deriveGroupPolicyName(g, 'aws-1-aws_bedrock'))).toEqual([
        'aws-1-aws_bedrock',
        'aws-1-aws_bedrock-prod',
      ]);
    });

    it('names a duplicate by its modal service name as before', () => {
      const groups = groupsFor([original('elb', 'aws_bedrock')], {}, [
        duplicate('elb__dup-1', 'aws-1-aws_bedrock [Duplicate]', 'aws_bedrock'),
      ]);
      expect(deriveGroupPolicyName(groups[1], 'aws-1-aws_bedrock')).toBe(
        'aws-1-aws_bedrock [Duplicate]'
      );
    });
  });

  it('keeps names unique when a namespace spells the same suffix as another package', () => {
    // `aws` in namespace `aws_bedrock` and `aws_bedrock` in the default namespace both spell
    // `-aws_bedrock`.
    const groups = groupsFor(
      [original('elb'), original('s3'), original('bedrock', 'aws_bedrock')],
      { s3: withNamespace('aws_bedrock') }
    );
    const names = groups.map((g) => deriveGroupPolicyName(g, 'my-aws'));
    expect(new Set(names).size).toBe(groups.length);
    expect(names).toEqual(['my-aws', 'my-aws-aws_bedrock', 'my-aws-aws_bedrock_2']);
  });

  it('suffixes every package when several non-aws packages are selected', () => {
    const groups = groupsFor([
      original('bedrock', 'aws_bedrock'),
      original('hub', 'aws_securityhub'),
    ]);
    expect(groups.map((g) => deriveGroupPolicyName(g, 'my-aws'))).toEqual([
      'my-aws-aws_bedrock',
      'my-aws-aws_securityhub',
    ]);
  });
});

describe('getBareNamePackage', () => {
  it('is the only package when there is just one', () => {
    expect(getBareNamePackage(['aws_bedrock', 'aws_bedrock'])).toBe('aws_bedrock');
    expect(getBareNamePackage(['aws'])).toBe('aws');
  });

  it('is the main package otherwise', () => {
    expect(getBareNamePackage(['aws_bedrock', 'aws'])).toBe('aws');
    expect(getBareNamePackage(['aws_bedrock', 'aws_securityhub'])).toBe('aws');
    expect(getBareNamePackage([])).toBe('aws');
  });
});

describe('getSourcePolicyName', () => {
  it('is the name as entered for the main package in the default namespace', () => {
    expect(getSourcePolicyName(' my-aws ', 'aws')).toBe('my-aws');
    expect(getSourcePolicyName('my-aws', 'aws', 'default')).toBe('my-aws');
  });

  it('adds the package of other packages and the namespace', () => {
    expect(getSourcePolicyName('my-aws', 'aws', 'prod')).toBe('my-aws-prod');
    expect(getSourcePolicyName('my-aws', 'aws_bedrock')).toBe('my-aws-aws_bedrock');
    expect(getSourcePolicyName('my-aws', 'aws_bedrock', 'prod')).toBe('my-aws-aws_bedrock-prod');
  });

  it('leaves out the package of the bare-name package', () => {
    expect(getSourcePolicyName('aws-1-aws_bedrock', 'aws_bedrock', undefined, 'aws_bedrock')).toBe(
      'aws-1-aws_bedrock'
    );
    expect(getSourcePolicyName('aws-1-aws_bedrock', 'aws_bedrock', 'prod', 'aws_bedrock')).toBe(
      'aws-1-aws_bedrock-prod'
    );
  });

  it('matches the name the deploy gives the original instance', () => {
    const [, prodGroup] = groupByPackage(
      [original('elb'), original('s3')],
      [],
      { s3: withNamespace('prod') },
      DEFAULT_NAMESPACE
    );
    expect(deriveGroupPolicyName(prodGroup, 'my-aws')).toBe(
      getSourcePolicyName('my-aws', 'aws', 'prod')
    );
  });
});
