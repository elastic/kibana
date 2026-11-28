/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import { FleetErrorWithStatusCode } from '../../../errors';

import { reviewUpgrade, updatePackage } from './update';

jest.mock('./get', () => ({
  getInstallationObject: jest.fn(),
  getPackageInfo: jest.fn(),
}));
jest.mock('./update_logsdb_columnar', () => ({
  setLogsdbColumnarChoice: jest.fn(),
}));
jest.mock('../../audit_logging', () => ({
  auditLoggingService: { writeCustomSoAuditLog: jest.fn() },
}));

const { getInstallationObject, getPackageInfo } = jest.requireMock('./get');
const { setLogsdbColumnarChoice } = jest.requireMock('./update_logsdb_columnar');

const pendingReview = {
  target_version: '2.0.0',
  reason: 'deprecated' as const,
  created_at: '2026-01-01T00:00:00.000Z',
  deprecation_details: { description: 'Deprecated input' },
};

describe('reviewUpgrade', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw when package is not installed', async () => {
    const soClient = savedObjectsClientMock.create();
    getInstallationObject.mockResolvedValueOnce(null);

    await expect(
      reviewUpgrade({
        savedObjectsClient: soClient,
        pkgName: 'test-pkg',
        action: 'accept',
        targetVersion: '2.0.0',
      })
    ).rejects.toThrow('Error while reviewing upgrade: test-pkg is not installed');
  });

  it('should throw when no pending review exists for the target version', async () => {
    const soClient = savedObjectsClientMock.create();
    getInstallationObject.mockResolvedValueOnce({
      id: 'test-pkg',
      attributes: { name: 'test-pkg', version: '2.0.0', pending_upgrade_review: undefined },
    });

    await expect(
      reviewUpgrade({
        savedObjectsClient: soClient,
        pkgName: 'test-pkg',
        action: 'accept',
        targetVersion: '2.0.0',
      })
    ).rejects.toThrow('No pending upgrade review for test-pkg@2.0.0');
  });

  it('should set action to accepted on accept', async () => {
    const soClient = savedObjectsClientMock.create();
    getInstallationObject.mockResolvedValueOnce({
      id: 'test-pkg',
      attributes: {
        name: 'test-pkg',
        version: '2.0.0',
        pending_upgrade_review: pendingReview,
      },
    });

    await reviewUpgrade({
      savedObjectsClient: soClient,
      pkgName: 'test-pkg',
      action: 'accept',
      targetVersion: '2.0.0',
    });

    expect(soClient.update).toHaveBeenCalledWith(PACKAGES_SAVED_OBJECT_TYPE, 'test-pkg', {
      pending_upgrade_review: {
        ...pendingReview,
        action: 'accepted',
      },
    });
  });

  it('should set action to declined on decline', async () => {
    const soClient = savedObjectsClientMock.create();
    getInstallationObject.mockResolvedValueOnce({
      id: 'test-pkg',
      attributes: {
        name: 'test-pkg',
        version: '2.0.0',
        pending_upgrade_review: pendingReview,
      },
    });

    await reviewUpgrade({
      savedObjectsClient: soClient,
      pkgName: 'test-pkg',
      action: 'decline',
      targetVersion: '2.0.0',
    });

    expect(soClient.update).toHaveBeenCalledWith(PACKAGES_SAVED_OBJECT_TYPE, 'test-pkg', {
      pending_upgrade_review: {
        ...pendingReview,
        action: 'declined',
      },
    });
  });

  it('should set action to pending when re-enabling a declined review', async () => {
    const soClient = savedObjectsClientMock.create();
    getInstallationObject.mockResolvedValueOnce({
      id: 'test-pkg',
      attributes: {
        name: 'test-pkg',
        version: '2.0.0',
        pending_upgrade_review: { ...pendingReview, action: 'declined' },
      },
    });

    await reviewUpgrade({
      savedObjectsClient: soClient,
      pkgName: 'test-pkg',
      action: 'pending',
      targetVersion: '2.0.0',
    });

    expect(soClient.update).toHaveBeenCalledWith(PACKAGES_SAVED_OBJECT_TYPE, 'test-pkg', {
      pending_upgrade_review: {
        ...pendingReview,
        action: 'pending',
      },
    });
  });
});

describe('updatePackage — namespace_customization_settings per-namespace merge', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('merges incoming namespace settings per-namespace, preserving namespaces absent from the payload', async () => {
    const soClient = savedObjectsClientMock.create();
    getInstallationObject.mockResolvedValueOnce({
      id: 'test-pkg',
      attributes: {
        name: 'test-pkg',
        version: '1.0.0',
        namespace_customization_settings: {
          production: { ilm_policy: 'old-policy' },
          staging: { ilm_policy: 'hot-warm' },
        },
      },
    });
    getPackageInfo.mockResolvedValueOnce({});

    const { ilmPolicyChanges } = await updatePackage({
      savedObjectsClient: soClient,
      pkgName: 'test-pkg',
      namespace_customization_settings: { production: { ilm_policy: 'new-policy' } },
    });

    // staging is preserved; only production changed
    expect(soClient.update).toHaveBeenCalledWith(
      PACKAGES_SAVED_OBJECT_TYPE,
      'test-pkg',
      expect.objectContaining({
        namespace_customization_settings: {
          production: { ilm_policy: 'new-policy' },
          staging: { ilm_policy: 'hot-warm' },
        },
      }),
      expect.objectContaining({ mergeAttributes: false })
    );
    expect(ilmPolicyChanges).toEqual([{ namespace: 'production', ilmPolicy: 'new-policy' }]);
  });

  it('clears a namespace when the payload sends an empty object for it', async () => {
    const soClient = savedObjectsClientMock.create();
    getInstallationObject.mockResolvedValueOnce({
      id: 'test-pkg',
      attributes: {
        name: 'test-pkg',
        version: '1.0.0',
        namespace_customization_settings: {
          production: { ilm_policy: 'old-policy' },
          staging: { ilm_policy: 'hot-warm' },
        },
      },
    });
    getPackageInfo.mockResolvedValueOnce({});

    const { ilmPolicyChanges } = await updatePackage({
      savedObjectsClient: soClient,
      pkgName: 'test-pkg',
      namespace_customization_settings: { production: {} },
    });

    // production is deleted (empty object = clear); staging is untouched
    expect(soClient.update).toHaveBeenCalledWith(
      PACKAGES_SAVED_OBJECT_TYPE,
      'test-pkg',
      expect.objectContaining({
        namespace_customization_settings: {
          staging: { ilm_policy: 'hot-warm' },
        },
      }),
      expect.objectContaining({ mergeAttributes: false })
    );
    expect(ilmPolicyChanges).toEqual([{ namespace: 'production', ilmPolicy: undefined }]);
  });
});

describe('updatePackage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should clear pending_upgrade_review when disabling keep_policies_up_to_date', async () => {
    const soClient = savedObjectsClientMock.create();
    getInstallationObject.mockResolvedValueOnce({
      id: 'test-pkg',
      attributes: {
        name: 'test-pkg',
        version: '1.0.0',
        pending_upgrade_review: pendingReview,
      },
    });
    getPackageInfo.mockResolvedValueOnce({});

    await updatePackage({
      savedObjectsClient: soClient,
      pkgName: 'test-pkg',
      keepPoliciesUpToDate: false,
    });

    expect(soClient.update).toHaveBeenCalledWith(PACKAGES_SAVED_OBJECT_TYPE, 'test-pkg', {
      keep_policies_up_to_date: false,
      pending_upgrade_review: undefined,
    });
  });

  it('should not clear pending_upgrade_review when enabling keep_policies_up_to_date', async () => {
    const soClient = savedObjectsClientMock.create();
    getInstallationObject.mockResolvedValueOnce({
      id: 'test-pkg',
      attributes: {
        name: 'test-pkg',
        version: '1.0.0',
        pending_upgrade_review: pendingReview,
      },
    });
    getPackageInfo.mockResolvedValueOnce({});

    await updatePackage({
      savedObjectsClient: soClient,
      pkgName: 'test-pkg',
      keepPoliciesUpToDate: true,
    });

    expect(soClient.update).toHaveBeenCalledWith(PACKAGES_SAVED_OBJECT_TYPE, 'test-pkg', {
      keep_policies_up_to_date: true,
    });
  });
});

describe('updatePackage — logsdb_columnar', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggerMock.create();

  const mockInstallation = (attributes: Record<string, unknown> = {}) => {
    getInstallationObject.mockResolvedValueOnce({
      id: 'test-pkg',
      attributes: { name: 'test-pkg', version: '1.0.0', ...attributes },
    });
    getPackageInfo.mockResolvedValueOnce({});
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('hands the choice to the shared path with the installation, before anything else is written', async () => {
    const soClient = savedObjectsClientMock.create();
    mockInstallation();
    setLogsdbColumnarChoice.mockResolvedValueOnce({ changed: true });

    await updatePackage({
      savedObjectsClient: soClient,
      esClient,
      logger,
      pkgName: 'test-pkg',
      logsdb_columnar: true,
    });

    expect(setLogsdbColumnarChoice).toHaveBeenCalledWith({
      savedObjectsClient: soClient,
      esClient,
      logger,
      pkgName: 'test-pkg',
      enabled: true,
      installation: expect.objectContaining({ id: 'test-pkg' }),
    });
    expect(setLogsdbColumnarChoice.mock.invocationCallOrder[0]).toBeLessThan(
      soClient.update.mock.invocationCallOrder[0]
    );
  });

  it('keeps the stored choice when the request also replaces the whole document', async () => {
    const soClient = savedObjectsClientMock.create();
    mockInstallation({ namespace_customization_enabled_for: ['production'] });
    setLogsdbColumnarChoice.mockResolvedValueOnce({ changed: true });

    await updatePackage({
      savedObjectsClient: soClient,
      esClient,
      logger,
      pkgName: 'test-pkg',
      logsdb_columnar: true,
      namespace_customization_settings: { production: { ilm_policy: 'hot-warm' } },
    });

    expect(soClient.update).toHaveBeenCalledWith(
      PACKAGES_SAVED_OBJECT_TYPE,
      'test-pkg',
      expect.objectContaining({ logsdb_columnar_enabled: true }),
      expect.objectContaining({ mergeAttributes: false })
    );
  });

  it('writes nothing when the choice is rejected', async () => {
    const soClient = savedObjectsClientMock.create();
    mockInstallation();
    setLogsdbColumnarChoice.mockRejectedValueOnce(
      new FleetErrorWithStatusCode('test-pkg has no logs data stream that declares readiness', 400)
    );

    await expect(
      updatePackage({
        savedObjectsClient: soClient,
        esClient,
        logger,
        pkgName: 'test-pkg',
        keepPoliciesUpToDate: true,
        logsdb_columnar: true,
      })
    ).rejects.toThrow(/has no logs data stream that declares readiness/);

    expect(soClient.update).not.toHaveBeenCalled();
  });

  it('leaves the choice alone when the request does not carry it', async () => {
    const soClient = savedObjectsClientMock.create();
    mockInstallation();

    await updatePackage({
      savedObjectsClient: soClient,
      esClient,
      logger,
      pkgName: 'test-pkg',
      keepPoliciesUpToDate: true,
    });

    expect(setLogsdbColumnarChoice).not.toHaveBeenCalled();
  });

  it('refuses to change the choice without an Elasticsearch client to apply it with', async () => {
    const soClient = savedObjectsClientMock.create();
    mockInstallation();

    await expect(
      updatePackage({ savedObjectsClient: soClient, pkgName: 'test-pkg', logsdb_columnar: true })
    ).rejects.toThrow(/An Elasticsearch client and a logger are required/);

    expect(setLogsdbColumnarChoice).not.toHaveBeenCalled();
    expect(soClient.update).not.toHaveBeenCalled();
  });
});
