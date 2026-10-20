/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceInstance, ServiceVars } from '../service_settings_step/use_service_settings';
import { DEFAULT_NAMESPACE, deriveGroupPolicyName, groupByPackage } from './deploy_group_helpers';
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
  const duplicate = (id: string, name: string, packageName = 'aws') => ({
    instance: { instanceId: id, serviceId: 'elb', name, isDuplicate: true } as ServiceInstance,
    service: { id: 'elb', packageName } as AwsServiceMatrixEntry,
  });

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

  it('names a duplicate after the service name typed in the duplicate modal', () => {
    const groups = groupsFor([original('elb')], {}, [duplicate('elb__dup-1', 'ALB prod/eu')]);
    expect(deriveGroupPolicyName(groups[1], 'my-aws')).toBe('ALB prod_eu');
  });

  it('keeps names unique when sanitizing makes namespaces equal', () => {
    const groups = groupsFor([original('a', 'aws_bedrock'), original('b', 'aws_bedrock')], {
      a: withNamespace('prod.eu'),
      b: withNamespace('prod_eu'),
    });
    const names = groups.map((g) => deriveGroupPolicyName(g, 'my-aws'));
    expect(new Set(names).size).toBe(2);
  });

  it('truncates to the Fleet name limit', () => {
    const [group] = groupsFor([original('bedrock', 'aws_bedrock')]);
    expect(deriveGroupPolicyName(group, 'x'.repeat(250))!.length).toBe(255);
  });
});
