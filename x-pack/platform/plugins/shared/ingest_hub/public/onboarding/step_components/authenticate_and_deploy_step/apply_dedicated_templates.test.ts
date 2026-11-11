/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendGetPackageInfoByKey, sendUpdatePackage } from '@kbn/fleet-plugin/public';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceInstance } from '../service_settings_step/use_service_settings';
import {
  applyDedicatedNamespaceTemplates,
  getGlobalNamespacePackages,
} from './apply_dedicated_templates';
import type { DeployGroup } from './deploy_groups';

jest.mock('@kbn/fleet-plugin/public', () => ({
  sendGetPackageInfoByKey: jest.fn(),
  sendUpdatePackage: jest.fn(),
}));

const mockGetInfo = sendGetPackageInfoByKey as jest.Mock;
const mockUpdate = sendUpdatePackage as jest.Mock;

const group = (packageName: string, namespace: string, isDuplicateGroup = false): DeployGroup => ({
  groupId: `${packageName}__${namespace}`,
  instanceIds: [packageName],
  members: [
    {
      instance: { instanceId: packageName } as ServiceInstance,
      service: { packageName } as AwsServiceMatrixEntry,
    },
  ],
  isDuplicateGroup,
  namespace,
});

const info = (version: string | undefined, enabledFor?: string[]) => ({
  data: {
    item: {
      installationInfo: version
        ? { version, namespace_customization_enabled_for: enabledFor }
        : undefined,
    },
  },
});

describe('getGlobalNamespacePackages', () => {
  it('returns the packages deployed into the global namespace, once each', () => {
    expect(
      getGlobalNamespacePackages(
        [group('aws', 'prod'), group('aws_bedrock', 'prod'), group('aws', 'prod', true)],
        'prod'
      )
    ).toEqual(['aws', 'aws_bedrock']);
  });

  it('leaves out groups in another namespace, such as a duplicate with its own', () => {
    expect(
      getGlobalNamespacePackages(
        [group('aws', 'prod'), group('aws_bedrock', 'staging', true)],
        'prod'
      )
    ).toEqual(['aws']);
  });

  it('returns nothing without a global namespace', () => {
    expect(getGlobalNamespacePackages([group('aws', '')], '')).toEqual([]);
  });
});

describe('applyDedicatedNamespaceTemplates', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUpdate.mockResolvedValue({ error: null });
  });

  it('adds the namespace to the installed version of the package, keeping the others', async () => {
    mockGetInfo.mockResolvedValue(info('2.1.0', ['staging']));

    const { failedPackages } = await applyDedicatedNamespaceTemplates(['aws'], 'prod');

    expect(failedPackages).toEqual([]);
    expect(mockUpdate).toHaveBeenCalledWith('aws', '2.1.0', {
      namespace_customization_enabled_for: ['staging', 'prod'],
    });
  });

  it('starts the list when the package has none', async () => {
    mockGetInfo.mockResolvedValue(info('2.1.0'));

    await applyDedicatedNamespaceTemplates(['aws'], 'prod');

    expect(mockUpdate).toHaveBeenCalledWith('aws', '2.1.0', {
      namespace_customization_enabled_for: ['prod'],
    });
  });

  it('does nothing for a package that already has the namespace', async () => {
    mockGetInfo.mockResolvedValue(info('2.1.0', ['prod']));

    expect(await applyDedicatedNamespaceTemplates(['aws'], 'prod')).toEqual({
      failedPackages: [],
      blockedDataStreams: [],
      overriddenDataStreams: [],
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('reports the packages that could not be updated and still updates the others', async () => {
    mockGetInfo.mockResolvedValue(info('2.1.0'));
    mockUpdate.mockImplementation(async (name: string) => ({
      error: name === 'aws' ? new Error('prefix not allowed') : null,
    }));

    const { failedPackages } = await applyDedicatedNamespaceTemplates(
      ['aws', 'aws_bedrock'],
      'prod'
    );

    expect(failedPackages).toEqual(['aws']);
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it('reports a package whose info is unavailable or that is not installed', async () => {
    mockGetInfo.mockImplementation(async (name: string) =>
      name === 'aws' ? { data: null, error: new Error('not found') } : info(undefined)
    );

    const { failedPackages } = await applyDedicatedNamespaceTemplates(
      ['aws', 'aws_bedrock'],
      'prod'
    );

    expect(failedPackages).toEqual(['aws', 'aws_bedrock']);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('keeps apart the data streams an existing template blocks and the ones the dedicated template overrides, without failing', async () => {
    mockGetInfo.mockResolvedValue(info('2.1.0'));
    const warning = (dataStreamName: string, ...conflictTypes: string[]) => ({
      dataStreamName,
      conflictingTemplates: conflictTypes.map((conflictType) => ({ conflictType })),
    });
    mockUpdate.mockResolvedValue({
      data: {
        warnings: [
          warning('logs-aws.cloudtrail-prod', 'overrides_fleet'),
          warning('logs-aws.cloudtrail-prod', 'blocked_by_same_priority'),
          warning('metrics-aws.ec2_metrics-prod', 'overridden_by_fleet'),
        ],
      },
      error: null,
    });

    expect(await applyDedicatedNamespaceTemplates(['aws'], 'prod')).toEqual({
      failedPackages: [],
      blockedDataStreams: ['logs-aws.cloudtrail-prod'],
      overriddenDataStreams: ['metrics-aws.ec2_metrics-prod'],
    });
  });

  it('reports a conflict type it does not know as blocked, so it is still shown', async () => {
    mockGetInfo.mockResolvedValue(info('2.1.0'));
    mockUpdate.mockResolvedValue({
      data: {
        warnings: [
          {
            dataStreamName: 'logs-aws.cloudtrail-prod',
            conflictingTemplates: [{ conflictType: 'a_type_from_a_newer_server' }],
          },
        ],
      },
      error: null,
    });

    expect(await applyDedicatedNamespaceTemplates(['aws'], 'prod')).toEqual({
      failedPackages: [],
      blockedDataStreams: ['logs-aws.cloudtrail-prod'],
      overriddenDataStreams: [],
    });
  });
});
