/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';

import { KibanaAssetType } from '../../../types';
import { FleetUnauthorizedError } from '../../../errors';
import { appContextService } from '../../app_context';
import { createArchiveIterator } from '../archive/archive_iterator';
import { getInstallationObject } from './get';

import {
  checkUploadPackageAssetPrivileges,
  collectArchiveSignals,
  buildRequiredActions,
} from './upload_preflight_authz';

jest.mock('../../app_context', () => ({
  appContextService: {
    getSecurity: jest.fn(),
    getConfig: jest.fn(),
  },
}));

jest.mock('../archive/archive_iterator', () => ({
  createArchiveIterator: jest.fn(),
}));

jest.mock('./get', () => ({
  getInstallationObject: jest.fn(),
}));

const mockRequest = {} as KibanaRequest;
const mockSpaceId = 'default';
const mockArchiveBuffer = Buffer.from('fake-archive');
const mockContentType = 'application/zip';
const mockSavedObjectsClient = {} as SavedObjectsClientContract;

function makeAssetBuffer(attributes: Record<string, unknown>): Buffer {
  return Buffer.from(JSON.stringify({ type: 'security-rule', attributes }));
}

function makeIterator(entries: Array<{ path: string; buffer?: Buffer }>) {
  return {
    traverseEntries: jest.fn(async (onEntry: any, readBuffer?: (path: string) => boolean) => {
      for (const entry of entries) {
        const shouldRead = readBuffer ? readBuffer(entry.path) : false;
        await onEntry({ path: entry.path, buffer: shouldRead ? entry.buffer : undefined });
      }
    }),
    getPaths: jest.fn().mockResolvedValue(entries.map((e) => e.path)),
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

describe('collectArchiveSignals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty signals for archives with no gated asset types', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([
        { path: 'mypackage-1.0.0/kibana/dashboard/my-dashboard.json' },
        { path: 'mypackage-1.0.0/kibana/visualization/my-viz.json' },
        { path: 'mypackage-1.0.0/elasticsearch/index_template/my-template.json' },
      ])
    );

    const signals = await collectArchiveSignals(mockArchiveBuffer, mockContentType);

    expect(signals.gatedTypesFound.size).toBe(0);
    expect(signals.blockedTypes).toHaveLength(0);
    expect(signals.hasMlSecurityRules).toBe(false);
  });

  it('detects security_rule as gated type', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/security_rule/my-rule.json' }])
    );

    const signals = await collectArchiveSignals(mockArchiveBuffer, mockContentType);

    expect(signals.gatedTypesFound.has('security_rule' as any)).toBe(true);
    expect(signals.blockedTypes).toHaveLength(0);
    expect(signals.hasMlSecurityRules).toBe(false);
  });

  it('reads buffer for security_rule paths to detect ML rules', async () => {
    const mlRuleBuffer = makeAssetBuffer({
      type: 'machine_learning',
      machine_learning_job_id: 'my-job',
    });
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([
        { path: 'mypackage-1.0.0/kibana/security_rule/my-rule.json', buffer: mlRuleBuffer },
      ])
    );

    const signals = await collectArchiveSignals(mockArchiveBuffer, mockContentType);

    expect(signals.hasMlSecurityRules).toBe(true);
  });

  it('does not set hasMlSecurityRules for non-ML security_rule', async () => {
    const queryRuleBuffer = makeAssetBuffer({ type: 'query', query: 'event.action: *' });
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([
        { path: 'mypackage-1.0.0/kibana/security_rule/my-rule.json', buffer: queryRuleBuffer },
      ])
    );

    const signals = await collectArchiveSignals(mockArchiveBuffer, mockContentType);

    expect(signals.gatedTypesFound.has('security_rule' as any)).toBe(true);
    expect(signals.hasMlSecurityRules).toBe(false);
  });

  it('does not read buffers for non-security_rule kibana assets', async () => {
    const iterator = makeIterator([
      {
        path: 'mypackage-1.0.0/kibana/security_ai_prompt/my-prompt.json',
        buffer: Buffer.from('{}'),
      },
    ]);
    (createArchiveIterator as jest.Mock).mockReturnValue(iterator);

    await collectArchiveSignals(mockArchiveBuffer, mockContentType);

    const traverseCall = iterator.traverseEntries.mock.calls[0];
    const readBufferFn = traverseCall[1]!;
    expect(readBufferFn('mypackage-1.0.0/kibana/security_ai_prompt/my-prompt.json')).toBe(false);
    expect(readBufferFn('mypackage-1.0.0/kibana/security_rule/my-rule.json')).toBe(true);
  });

  it('does not gate other kibana asset types (osquery, ml_module, csp, slo, alerting)', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([
        { path: 'mypackage-1.0.0/kibana/osquery_saved_query/my-query.json' },
        { path: 'mypackage-1.0.0/kibana/osquery_pack_asset/my-pack.json' },
        { path: 'mypackage-1.0.0/kibana/ml_module/my-module.json' },
        { path: 'mypackage-1.0.0/kibana/csp_rule_template/my-rule.json' },
        { path: 'mypackage-1.0.0/kibana/slo_template/my-slo.json' },
        { path: 'mypackage-1.0.0/kibana/alerting_rule_template/my-alert.json' },
      ])
    );

    const signals = await collectArchiveSignals(mockArchiveBuffer, mockContentType);

    expect(signals.gatedTypesFound.size).toBe(0);
    expect(signals.blockedTypes).toHaveLength(0);
  });
});

describe('buildRequiredActions', () => {
  const security = makeSecurity(true);

  it('returns rules-all for security_rule type', () => {
    const signals = {
      gatedTypesFound: new Set<KibanaAssetType>([KibanaAssetType.securityRule]),
      blockedTypes: [],
      hasMlSecurityRules: false,
      pkgName: undefined,
    };

    expect(buildRequiredActions(signals, security as any)).toContain('api:rules-all');
  });

  it('adds ml:canCreateJob when hasMlSecurityRules is true', () => {
    const signals = {
      gatedTypesFound: new Set<KibanaAssetType>([KibanaAssetType.securityRule]),
      blockedTypes: [],
      hasMlSecurityRules: true,
      pkgName: undefined,
    };

    const actions = buildRequiredActions(signals, security as any);
    expect(actions).toContain('api:rules-all');
    expect(actions).toContain('api:ml:canCreateJob');
  });

  it('does not add ml:canCreateJob for non-ML security_rule', () => {
    const signals = {
      gatedTypesFound: new Set<KibanaAssetType>([KibanaAssetType.securityRule]),
      blockedTypes: [],
      hasMlSecurityRules: false,
      pkgName: undefined,
    };

    const actions = buildRequiredActions(signals, security as any);
    expect(actions).toContain('api:rules-all');
    expect(actions).not.toContain('api:ml:canCreateJob');
  });

  it('returns elasticAssistant for security_ai_prompt', () => {
    const signals = {
      gatedTypesFound: new Set<KibanaAssetType>([KibanaAssetType.securityAIPrompt]),
      blockedTypes: [],
      hasMlSecurityRules: false,
      pkgName: undefined,
    };

    expect(buildRequiredActions(signals, security as any)).toContain('api:elasticAssistant');
  });

  it('accumulates actions for both gated types', () => {
    const signals = {
      gatedTypesFound: new Set<KibanaAssetType>([
        KibanaAssetType.securityRule,
        KibanaAssetType.securityAIPrompt,
      ]),
      blockedTypes: [],
      hasMlSecurityRules: true,
      pkgName: undefined,
    };

    const actions = buildRequiredActions(signals, security as any);
    expect(actions).toContain('api:rules-all');
    expect(actions).toContain('api:elasticAssistant');
    expect(actions).toContain('api:ml:canCreateJob');
  });
});

describe('checkUploadPackageAssetPrivileges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getInstallationObject as jest.Mock).mockResolvedValue(undefined);
  });

  it('allows upload when archive contains no gated asset types', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([
        { path: 'mypackage-1.0.0/kibana/dashboard/my-dashboard.json' },
        { path: 'mypackage-1.0.0/kibana/visualization/my-viz.json' },
      ])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    await expect(
      checkUploadPackageAssetPrivileges(
        mockRequest,
        mockArchiveBuffer,
        mockContentType,
        mockSpaceId,
        mockSavedObjectsClient
      )
    ).resolves.toEqual([]);

    expect(security.authz.checkPrivilegesWithRequest).not.toHaveBeenCalled();
  });

  it('checks rules-all for non-ML security_rule package', async () => {
    const queryRuleBuffer = makeAssetBuffer({ type: 'query' });
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([
        { path: 'mypackage-1.0.0/kibana/security_rule/my-rule.json', buffer: queryRuleBuffer },
      ])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      mockSpaceId,
      mockSavedObjectsClient
    );

    const atSpaces = security.authz.checkPrivilegesWithRequest.mock.results[0].value.atSpaces;
    expect(atSpaces).toHaveBeenCalledWith(
      [mockSpaceId],
      expect.objectContaining({ kibana: expect.arrayContaining(['api:rules-all']) })
    );
    expect(atSpaces).toHaveBeenCalledWith(
      [mockSpaceId],
      expect.objectContaining({ kibana: expect.not.arrayContaining(['api:ml:canCreateJob']) })
    );
  });

  it('checks rules-all + ml:canCreateJob for ML security_rule package', async () => {
    const mlRuleBuffer = makeAssetBuffer({
      type: 'machine_learning',
      machine_learning_job_id: 'my-job',
    });
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([
        { path: 'mypackage-1.0.0/kibana/security_rule/my-rule.json', buffer: mlRuleBuffer },
      ])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      mockSpaceId,
      mockSavedObjectsClient
    );

    const atSpaces = security.authz.checkPrivilegesWithRequest.mock.results[0].value.atSpaces;
    expect(atSpaces).toHaveBeenCalledWith(
      [mockSpaceId],
      expect.objectContaining({
        kibana: expect.arrayContaining(['api:rules-all', 'api:ml:canCreateJob']),
      })
    );
  });

  it('throws FleetUnauthorizedError when caller lacks ml:canCreateJob for ML rule package', async () => {
    const mlRuleBuffer = makeAssetBuffer({ type: 'machine_learning' });
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([
        { path: 'mypackage-1.0.0/kibana/security_rule/my-rule.json', buffer: mlRuleBuffer },
      ])
    );

    const security = makeSecurity(false, ['api:ml:canCreateJob']);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    await expect(
      checkUploadPackageAssetPrivileges(
        mockRequest,
        mockArchiveBuffer,
        mockContentType,
        mockSpaceId,
        mockSavedObjectsClient
      )
    ).rejects.toThrow(FleetUnauthorizedError);
  });

  it('throws FleetUnauthorizedError when caller lacks rules-all for security_rule package', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/security_rule/my-rule.json' }])
    );

    const security = makeSecurity(false, ['api:rules-all']);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    await expect(
      checkUploadPackageAssetPrivileges(
        mockRequest,
        mockArchiveBuffer,
        mockContentType,
        mockSpaceId,
        mockSavedObjectsClient
      )
    ).rejects.toThrow(FleetUnauthorizedError);
  });

  it('checks elasticAssistant for security_ai_prompt package', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/security_ai_prompt/my-prompt.json' }])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      mockSpaceId,
      mockSavedObjectsClient
    );

    const atSpaces = security.authz.checkPrivilegesWithRequest.mock.results[0].value.atSpaces;
    expect(atSpaces).toHaveBeenCalledWith(
      [mockSpaceId],
      expect.objectContaining({ kibana: expect.arrayContaining(['api:elasticAssistant']) })
    );
  });

  it('accumulates union of required actions for mixed gated types', async () => {
    const mlRuleBuffer = makeAssetBuffer({ type: 'machine_learning' });
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([
        { path: 'mypackage-1.0.0/kibana/security_rule/my-rule.json', buffer: mlRuleBuffer },
        { path: 'mypackage-1.0.0/kibana/security_ai_prompt/my-prompt.json' },
        { path: 'mypackage-1.0.0/kibana/dashboard/my-dashboard.json' },
      ])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      mockSpaceId,
      mockSavedObjectsClient
    );

    const atSpaces = security.authz.checkPrivilegesWithRequest.mock.results[0].value.atSpaces;
    expect(atSpaces).toHaveBeenCalledWith(
      [mockSpaceId],
      expect.objectContaining({
        kibana: expect.arrayContaining([
          'api:rules-all',
          'api:ml:canCreateJob',
          'api:elasticAssistant',
        ]),
      })
    );
  });

  it('throws FleetUnauthorizedError when security plugin is unavailable (fail closed)', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/security_rule/my-rule.json' }])
    );
    (appContextService.getSecurity as jest.Mock).mockReturnValue(null);

    await expect(
      checkUploadPackageAssetPrivileges(
        mockRequest,
        mockArchiveBuffer,
        mockContentType,
        mockSpaceId,
        mockSavedObjectsClient
      )
    ).rejects.toThrow(FleetUnauthorizedError);
  });

  it('fans out to all additional spaces when upgrading from primary space', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/security_rule/my-rule.json' }])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);
    (getInstallationObject as jest.Mock).mockResolvedValue({
      attributes: {
        // Primary space matches the request space, so this is a primary-space upgrade.
        installed_kibana_space_id: mockSpaceId,
        additional_spaces_installed_kibana: {
          'space-a': [],
          'space-b': [],
        },
      },
    });

    await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      mockSpaceId,
      mockSavedObjectsClient
    );

    const atSpaces = security.authz.checkPrivilegesWithRequest.mock.results[0].value.atSpaces;
    expect(atSpaces).toHaveBeenCalledWith(
      expect.arrayContaining([mockSpaceId, 'space-a', 'space-b']),
      expect.objectContaining({ kibana: expect.arrayContaining(['api:rules-all']) })
    );
  });

  it('checks only the request space when uploading from an additional (non-primary) space', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/security_rule/my-rule.json' }])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);
    (getInstallationObject as jest.Mock).mockResolvedValue({
      attributes: {
        installed_kibana_space_id: 'primary-space',
        additional_spaces_installed_kibana: {
          'space-x': [],
          'space-y': [],
        },
      },
    });

    // Request from 'space-x', which is an additional space (not the primary).
    // installKibanaAssetsAndReferencesMultispace only writes to 'space-x' in this case,
    // so the privilege check must not require privileges in unrelated spaces.
    await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      'space-x',
      mockSavedObjectsClient
    );

    const atSpaces = security.authz.checkPrivilegesWithRequest.mock.results[0].value.atSpaces;
    expect(atSpaces).toHaveBeenCalledWith(
      ['space-x'],
      expect.anything()
    );
    expect(atSpaces).not.toHaveBeenCalledWith(
      expect.arrayContaining(['primary-space']),
      expect.anything()
    );
  });

  it('passes failOnUnexpectedError: true to getInstallationObject so SO errors abort preflight', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/security_rule/my-rule.json' }])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);
    (getInstallationObject as jest.Mock).mockResolvedValue(undefined);

    await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      mockSpaceId,
      mockSavedObjectsClient
    );

    expect(getInstallationObject).toHaveBeenCalledWith(
      expect.objectContaining({ failOnUnexpectedError: true })
    );
  });

  it('propagates SO error from getInstallationObject and aborts preflight (fail-closed)', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/security_rule/my-rule.json' }])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);
    (getInstallationObject as jest.Mock).mockRejectedValue(new Error('SO store unavailable'));

    await expect(
      checkUploadPackageAssetPrivileges(
        mockRequest,
        mockArchiveBuffer,
        mockContentType,
        mockSpaceId,
        mockSavedObjectsClient
      )
    ).rejects.toThrow('SO store unavailable');

    expect(security.authz.checkPrivilegesWithRequest).not.toHaveBeenCalled();
  });

  it('returns all destination spaces for a primary-space upgrade (used to cap propagation)', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/security_rule/my-rule.json' }])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);
    (getInstallationObject as jest.Mock).mockResolvedValue({
      attributes: {
        installed_kibana_space_id: mockSpaceId,
        additional_spaces_installed_kibana: {
          'space-a': [],
          'space-b': [],
        },
      },
    });

    // Request from primary space → fan-out: result includes request space + all additional spaces.
    const result = await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      mockSpaceId,
      mockSavedObjectsClient
    );

    expect(result).toEqual(expect.arrayContaining([mockSpaceId, 'space-a', 'space-b']));
    expect(result).toHaveLength(3);
  });

  it('returns only the request space for an additional-space install (no fan-out)', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/security_rule/my-rule.json' }])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);
    (getInstallationObject as jest.Mock).mockResolvedValue({
      attributes: {
        installed_kibana_space_id: 'primary-space',
        additional_spaces_installed_kibana: {
          'space-x': [],
          'space-y': [],
        },
      },
    });

    const result = await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      'space-x',
      mockSavedObjectsClient
    );

    expect(result).toEqual(['space-x']);
  });
});
