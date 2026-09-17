/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

import { FleetUnauthorizedError } from '../../errors';
import { appContextService } from '../../services';
import { createArchiveIterator } from '../../services/epm/archive/archive_iterator';

import { checkUploadPackageAssetPrivileges } from './upload_preflight_authz';

jest.mock('../../services', () => ({
  appContextService: {
    getSecurity: jest.fn(),
  },
}));

jest.mock('../../services/epm/archive/archive_iterator', () => ({
  createArchiveIterator: jest.fn(),
}));

const mockRequest = {} as KibanaRequest;
const mockSpaceId = 'default';
const mockArchiveBuffer = Buffer.from('fake-archive');
const mockContentType = 'application/zip';

function makeIterator(paths: string[]) {
  return {
    traverseEntries: jest.fn(async (onEntry: any) => {
      for (const path of paths) {
        await onEntry({ path });
      }
    }),
    getPaths: jest.fn().mockResolvedValue(paths),
  };
}

function makeSecurity(hasAllRequested: boolean, missingPrivileges: string[] = []) {
  const kibanaPrivileges = missingPrivileges.map((p) => ({ privilege: p, authorized: false }));
  return {
    authz: {
      actions: {
        api: {
          get: (name: string) => `api:${name}`,
        },
      },
      checkPrivilegesWithRequest: jest.fn().mockReturnValue({
        atSpaces: jest.fn().mockResolvedValue({
          hasAllRequested,
          privileges: { kibana: kibanaPrivileges },
        }),
      }),
    },
  };
}

describe('checkUploadPackageAssetPrivileges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows upload when archive contains no asset types with required privileges', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([
        'mypackage-1.0.0/kibana/dashboard/my-dashboard.json',
        'mypackage-1.0.0/kibana/visualization/my-viz.json',
        'mypackage-1.0.0/elasticsearch/index_template/my-template.json',
      ])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    await expect(
      checkUploadPackageAssetPrivileges(
        mockRequest,
        mockArchiveBuffer,
        mockContentType,
        mockSpaceId
      )
    ).resolves.toBeUndefined();

    // No privilege check needed for asset types without required privileges
    expect(security.authz.checkPrivilegesWithRequest).not.toHaveBeenCalled();
  });

  it('checks rules-all when archive contains security_rule assets', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([
        'mypackage-1.0.0/kibana/security_rule/my-rule.json',
        'mypackage-1.0.0/kibana/dashboard/my-dashboard.json',
      ])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      mockSpaceId
    );

    expect(security.authz.checkPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
    const atSpaces = security.authz.checkPrivilegesWithRequest.mock.results[0].value.atSpaces;
    expect(atSpaces).toHaveBeenCalledWith(
      [mockSpaceId],
      expect.objectContaining({
        kibana: expect.arrayContaining(['api:rules-all']),
      })
    );
  });

  it('throws FleetUnauthorizedError when caller lacks rules-all for security_rule package', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator(['mypackage-1.0.0/kibana/security_rule/my-rule.json'])
    );

    const security = makeSecurity(false, ['api:rules-all']);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    await expect(
      checkUploadPackageAssetPrivileges(
        mockRequest,
        mockArchiveBuffer,
        mockContentType,
        mockSpaceId
      )
    ).rejects.toThrow(FleetUnauthorizedError);
  });

  it('checks elasticAssistant when archive contains security_ai_prompt assets', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator(['mypackage-1.0.0/kibana/security_ai_prompt/my-prompt.json'])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      mockSpaceId
    );

    const atSpaces = security.authz.checkPrivilegesWithRequest.mock.results[0].value.atSpaces;
    expect(atSpaces).toHaveBeenCalledWith(
      [mockSpaceId],
      expect.objectContaining({
        kibana: expect.arrayContaining(['api:elasticAssistant']),
      })
    );
  });

  it('accumulates multiple required privileges for packages with multiple privileged asset types', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([
        'mypackage-1.0.0/kibana/security_rule/my-rule.json',
        'mypackage-1.0.0/kibana/security_ai_prompt/my-prompt.json',
        'mypackage-1.0.0/kibana/osquery_saved_query/my-query.json',
      ])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      mockSpaceId
    );

    const atSpaces = security.authz.checkPrivilegesWithRequest.mock.results[0].value.atSpaces;
    expect(atSpaces).toHaveBeenCalledWith(
      [mockSpaceId],
      expect.objectContaining({
        kibana: expect.arrayContaining([
          'api:rules-all',
          'api:elasticAssistant',
          'api:osquery-writeSavedQueries',
        ]),
      })
    );
  });

  it('throws FleetUnauthorizedError when security plugin is unavailable', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator(['mypackage-1.0.0/kibana/security_rule/my-rule.json'])
    );

    (appContextService.getSecurity as jest.Mock).mockReturnValue(null);

    await expect(
      checkUploadPackageAssetPrivileges(
        mockRequest,
        mockArchiveBuffer,
        mockContentType,
        mockSpaceId
      )
    ).rejects.toThrow(FleetUnauthorizedError);
  });

  it('checks osquery-writePacks for osquery_pack_asset', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator(['mypackage-1.0.0/kibana/osquery_pack_asset/my-pack.json'])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      mockSpaceId
    );

    const atSpaces = security.authz.checkPrivilegesWithRequest.mock.results[0].value.atSpaces;
    expect(atSpaces).toHaveBeenCalledWith(
      [mockSpaceId],
      expect.objectContaining({
        kibana: expect.arrayContaining(['api:osquery-writePacks']),
      })
    );
  });

  it('checks ml:canCreateJob for ml_module', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator(['mypackage-1.0.0/kibana/ml_module/my-module.json'])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      mockSpaceId
    );

    const atSpaces = security.authz.checkPrivilegesWithRequest.mock.results[0].value.atSpaces;
    expect(atSpaces).toHaveBeenCalledWith(
      [mockSpaceId],
      expect.objectContaining({
        kibana: expect.arrayContaining(['api:ml:canCreateJob']),
      })
    );
  });
});
