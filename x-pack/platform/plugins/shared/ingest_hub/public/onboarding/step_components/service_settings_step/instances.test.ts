/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { reconcileInstances } from './instances';
import type { ServiceInstance } from './use_service_settings';

const makeService = (id: string, overrides: Partial<AwsServiceMatrixEntry> = {}) =>
  ({ id, name: `${id} name`, showInUI: true, ...overrides } as unknown as AwsServiceMatrixEntry);

const servicesMap = new Map<string, AwsServiceMatrixEntry>([
  ['cloudtrail', makeService('cloudtrail')],
  ['vpcflow', makeService('vpcflow')],
  ['elb', makeService('elb')],
  ['hidden', makeService('hidden', { showInUI: false })],
]);

const base = (serviceId: string): ServiceInstance => ({
  instanceId: serviceId,
  serviceId,
  name: `${serviceId} name`,
  isDuplicate: false,
});

const duplicate = (serviceId: string, n: number): ServiceInstance => ({
  instanceId: `${serviceId}__dup-${n}`,
  serviceId,
  name: `${serviceId} (${n})`,
  isDuplicate: true,
});

describe('reconcileInstances', () => {
  it('builds one base instance per selected service when none are persisted', () => {
    expect(reconcileInstances([], ['vpcflow', 'cloudtrail'], servicesMap)).toEqual([
      base('vpcflow'),
      base('cloudtrail'),
    ]);
  });

  it('keeps persisted instances, including duplicates and custom names, for selected services', () => {
    const persisted = [base('cloudtrail'), { ...duplicate('cloudtrail', 1), name: 'Prod trail' }];

    expect(reconcileInstances(persisted, ['cloudtrail'], servicesMap)).toEqual(persisted);
  });

  it('drops the instances of deselected services, duplicates included', () => {
    const persisted = [base('cloudtrail'), duplicate('cloudtrail', 1), base('vpcflow')];

    expect(reconcileInstances(persisted, ['vpcflow'], servicesMap)).toEqual([base('vpcflow')]);
  });

  it('appends a base instance for a newly selected service', () => {
    const persisted = [base('cloudtrail'), duplicate('cloudtrail', 1)];

    expect(reconcileInstances(persisted, ['cloudtrail', 'elb'], servicesMap)).toEqual([
      ...persisted,
      base('elb'),
    ]);
  });

  it('skips services that are hidden or missing from the services map', () => {
    expect(reconcileInstances([], ['hidden', 'unknown', 'elb'], servicesMap)).toEqual([
      base('elb'),
    ]);
  });

  it('returns nothing while the services map is empty and nothing is persisted', () => {
    expect(reconcileInstances([], ['cloudtrail'], new Map())).toEqual([]);
  });

  it('keeps persisted instances even when the services map is empty', () => {
    const persisted = [base('cloudtrail'), duplicate('cloudtrail', 1)];

    expect(reconcileInstances(persisted, ['cloudtrail'], new Map())).toEqual(persisted);
  });
});
