/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

import { createAppContextStartContractMock } from '../../../mocks';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../common';
import { appContextService } from '../../app_context';

import { auditLoggingService } from '../../audit_logging';

import { updatePackage } from './update';
import { getPackageInfo, getInstallationObject } from './get';

jest.mock('./get');
jest.mock('../../audit_logging');

const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;
const mockGetPackageInfo = getPackageInfo as jest.MockedFunction<typeof getPackageInfo>;
const mockGetInstallationObject = getInstallationObject as jest.MockedFunction<
  typeof getInstallationObject
>;

describe('updatePackage', () => {
  let mockContract: ReturnType<typeof createAppContextStartContractMock>;

  beforeEach(() => {
    mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);
  });

  afterEach(() => {
    appContextService.stop();
  });

  it('should call audit logger', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();

    mockGetPackageInfo.mockResolvedValueOnce({
      name: 'test-package',
      title: 'Test package',
      description: 'Test package',
      format_version: '1.0.0',
      version: '1.0.0',
      latestVersion: '1.0.0',
      owner: {
        github: 'elastic',
      },
      assets: {
        elasticsearch: {},
        kibana: {},
      },
    } as any);

    mockGetInstallationObject.mockResolvedValueOnce({
      id: 'test-package',
      attributes: {
        name: 'test-package',
      } as any,
      references: [],
      type: PACKAGES_SAVED_OBJECT_TYPE,
    });

    await updatePackage({
      savedObjectsClient,
      pkgName: 'test-package',
      keepPoliciesUpToDate: true,
    });

    expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
      action: 'update',
      id: 'test-package',
      name: 'test-package',
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });
  });
});
