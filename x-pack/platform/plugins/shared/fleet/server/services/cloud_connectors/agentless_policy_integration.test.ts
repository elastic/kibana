/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  savedObjectsClientMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';

import type { AgentPolicy, NewPackagePolicy } from '../../types';
import type { PackageInfo } from '../../../common/types';
import { cloudConnectorService } from '../cloud_connector';

import { createAndIntegrateCloudConnector } from './agentless_policy_integration';

jest.mock('../secrets/cloud_connector', () => ({
  extractAndCreateCloudConnectorSecrets: jest.fn().mockResolvedValue(undefined),
}));

describe('createAndIntegrateCloudConnector — policy group enforcement on reuse', () => {
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  const logger = loggingSystemMock.createLogger();

  const buildAgentPolicy = (): AgentPolicy =>
    ({
      id: 'agent-policy-1',
      agentless: { cloud_connectors: { enabled: true, target_csp: 'aws' } },
    } as any);

  const buildPackagePolicy = (cloudConnectorId?: string): NewPackagePolicy =>
    ({
      name: 'test-policy',
      namespace: 'default',
      inputs: [],
      cloud_connector_id: cloudConnectorId,
    } as any);

  const buildPackageInfo = (name: string): PackageInfo => ({ name } as any);

  const mockConnectorUsage = (
    soClient: ReturnType<typeof savedObjectsClientMock.create>,
    packageNames: string[]
  ) => {
    soClient.find.mockResolvedValue({
      saved_objects: packageNames.map((pkgName) => ({
        attributes: { package: { name: pkgName } },
      })),
      total: packageNames.length,
      per_page: 1,
      page: 1,
    } as any);
  };

  let getByIdSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    getByIdSpy = jest.spyOn(cloudConnectorService, 'getById').mockResolvedValue({
      id: 'connector-1',
      name: 'AWS Production',
      cloudProvider: 'aws',
      vars: {},
    } as any);
  });

  afterEach(() => {
    getByIdSpy.mockRestore();
  });

  const reuseConnector = (
    requestingPackage: string,
    soClient: any,
    attachedCloudConnectorId?: string
  ) =>
    createAndIntegrateCloudConnector({
      packagePolicy: buildPackagePolicy('connector-1'),
      agentPolicy: buildAgentPolicy(),
      policyName: 'test-policy',
      packageInfo: buildPackageInfo(requestingPackage),
      soClient,
      esClient,
      logger,
      attachedCloudConnectorId,
    });

  it('allows reuse within the provider-default group', async () => {
    const soClient = savedObjectsClientMock.create();
    // Connector currently used by the aws integration; requester is aws_securityhub —
    // both resolve to aws_default.
    mockConnectorUsage(soClient, ['aws']);

    const result = await reuseConnector('aws_securityhub', soClient);

    expect(result.cloudConnectorId).toBe('connector-1');
    expect(result.wasCreated).toBe(false);
  });

  it('allows reuse within the isolated group', async () => {
    const soClient = savedObjectsClientMock.create();
    mockConnectorUsage(soClient, ['cloud_security_posture']);

    const result = await reuseConnector('cloud_asset_inventory', soClient);

    expect(result.cloudConnectorId).toBe('connector-1');
    expect(result.wasCreated).toBe(false);
  });

  it('rejects a provider-default integration reusing an isolated-group connector', async () => {
    const soClient = savedObjectsClientMock.create();
    mockConnectorUsage(soClient, ['cloud_security_posture']);

    await expect(reuseConnector('aws_securityhub', soClient)).rejects.toThrow(
      /security_audit_policy_group.*cannot be reused/
    );
  });

  it('rejects an isolated-group integration reusing a provider-default connector', async () => {
    const soClient = savedObjectsClientMock.create();
    mockConnectorUsage(soClient, ['aws']);

    await expect(reuseConnector('cloud_security_posture', soClient)).rejects.toThrow(
      /aws_default.*cannot be reused/
    );
  });

  it('allows any integration to adopt a connector with no existing usages', async () => {
    const soClient = savedObjectsClientMock.create();
    mockConnectorUsage(soClient, []);

    const result = await reuseConnector('aws_securityhub', soClient);

    expect(result.cloudConnectorId).toBe('connector-1');
    expect(result.wasCreated).toBe(false);
  });

  it('rejects when ANY usage is cross-group, regardless of order (mixed pre-enforcement data)', async () => {
    const soClient = savedObjectsClientMock.create();
    // Same-group usage listed first: a single-usage sample would wrongly allow this
    mockConnectorUsage(soClient, ['aws', 'cloud_security_posture']);

    await expect(reuseConnector('aws_securityhub', soClient)).rejects.toThrow(
      /security_audit_policy_group.*cannot be reused/
    );
  });

  it('grandfathers re-saving a policy with its already-attached connector (update path)', async () => {
    const soClient = savedObjectsClientMock.create();
    // Mixed pre-enforcement connector: the update must stay editable
    mockConnectorUsage(soClient, ['cloud_security_posture', 'aws']);

    const result = await reuseConnector('aws_securityhub', soClient, 'connector-1');

    expect(result.cloudConnectorId).toBe('connector-1');
    expect(result.wasCreated).toBe(false);
    // Group check skipped entirely — no usage lookup
    expect(soClient.find).not.toHaveBeenCalled();
  });

  it('still enforces groups when the update swaps to a DIFFERENT connector', async () => {
    const soClient = savedObjectsClientMock.create();
    mockConnectorUsage(soClient, ['cloud_security_posture']);

    // Policy currently attached to another-connector; requesting connector-1 is a new attachment
    await expect(reuseConnector('aws_securityhub', soClient, 'another-connector')).rejects.toThrow(
      /security_audit_policy_group.*cannot be reused/
    );
  });

  it('rejects reuse when the connector provider does not match the policy provider', async () => {
    const soClient = savedObjectsClientMock.create();
    getByIdSpy.mockResolvedValue({
      id: 'connector-1',
      name: 'Azure Production',
      cloudProvider: 'azure',
      vars: {},
    } as any);

    await expect(reuseConnector('aws_securityhub', soClient)).rejects.toThrow(
      /is for azure but policy requires aws/
    );
  });

  it('skips the cloud connector flow entirely when cloud connectors are not enabled', async () => {
    const soClient = savedObjectsClientMock.create();
    const result = await createAndIntegrateCloudConnector({
      packagePolicy: buildPackagePolicy('connector-1'),
      agentPolicy: { id: 'agent-policy-1' } as any,
      policyName: 'test-policy',
      packageInfo: buildPackageInfo('aws_securityhub'),
      soClient,
      esClient,
      logger,
    });

    expect(result.wasCreated).toBe(false);
    expect(soClient.find).not.toHaveBeenCalled();
  });
});
