/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceInstance, ServiceVars } from '../service_settings_step/use_service_settings';
import { DEFAULT_NAMESPACE, groupByPackage } from './deploy_group_helpers';
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
