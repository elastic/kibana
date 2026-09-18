/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

import { KibanaAssetType } from '../../../types';
import { FleetUnauthorizedError } from '../../../errors';
import { appContextService } from '../../app_context';
import { createArchiveIterator } from '../archive/archive_iterator';

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

jest.mock('./install', () => ({
  PACKAGES_TO_INSTALL_WITH_STREAMING: ['security_detection_engine'],
}));

const mockRequest = {} as KibanaRequest;
const mockSpaceId = 'default';
const mockArchiveBuffer = Buffer.from('fake-archive');
const mockContentType = 'application/zip';

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
    expect(signals.hasMlSecurityRules).toBe(false);
  });

  it('detects security_rule as gated type', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/security_rule/my-rule.json' }])
    );

    const signals = await collectArchiveSignals(mockArchiveBuffer, mockContentType);

    expect(signals.gatedTypesFound.has('security_rule' as any)).toBe(true);
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
  });
});

describe('buildRequiredActions', () => {
  const security = makeSecurity(true);

  it('returns rules-all for security_rule type', () => {
    const signals = {
      gatedTypesFound: new Set<KibanaAssetType>([KibanaAssetType.securityRule]),
      hasMlSecurityRules: false,
    };

    expect(buildRequiredActions(signals, security as any)).toContain('api:rules-all');
  });

  it('adds ml:canCreateJob when hasMlSecurityRules is true', () => {
    const signals = {
      gatedTypesFound: new Set<KibanaAssetType>([KibanaAssetType.securityRule]),
      hasMlSecurityRules: true,
    };

    const actions = buildRequiredActions(signals, security as any);
    expect(actions).toContain('api:rules-all');
    expect(actions).toContain('api:ml:canCreateJob');
  });

  it('does not add ml:canCreateJob for non-ML security_rule', () => {
    const signals = {
      gatedTypesFound: new Set<KibanaAssetType>([KibanaAssetType.securityRule]),
      hasMlSecurityRules: false,
    };

    const actions = buildRequiredActions(signals, security as any);
    expect(actions).toContain('api:rules-all');
    expect(actions).not.toContain('api:ml:canCreateJob');
  });

  it('returns elasticAssistant for security_ai_prompt', () => {
    const signals = {
      gatedTypesFound: new Set<KibanaAssetType>([KibanaAssetType.securityAIPrompt]),
      hasMlSecurityRules: false,
    };

    expect(buildRequiredActions(signals, security as any)).toContain('api:elasticAssistant');
  });

  it('accumulates actions for both gated types', () => {
    const signals = {
      gatedTypesFound: new Set<KibanaAssetType>([
        KibanaAssetType.securityRule,
        KibanaAssetType.securityAIPrompt,
      ]),
      hasMlSecurityRules: true,
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
        'mypackage',
        undefined
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
      'mypackage',
      undefined
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
      'mypackage',
      undefined
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
        'mypackage',
        undefined
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
        'mypackage',
        undefined
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
      'mypackage',
      undefined
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
      'mypackage',
      undefined
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
        'mypackage',
        undefined
      )
    ).rejects.toThrow(FleetUnauthorizedError);
  });

  it('fans out to all additional spaces when upgrading from primary space', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/security_rule/my-rule.json' }])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    const installation = {
      attributes: {
        installed_kibana_space_id: mockSpaceId,
        additional_spaces_installed_kibana: { 'space-a': [], 'space-b': [] },
      },
    } as any;

    await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      mockSpaceId,
      'mypackage',
      installation
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

    const installation = {
      attributes: {
        installed_kibana_space_id: 'primary-space',
        additional_spaces_installed_kibana: { 'space-x': [], 'space-y': [] },
      },
    } as any;

    await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      'space-x',
      'mypackage',
      installation
    );

    const atSpaces = security.authz.checkPrivilegesWithRequest.mock.results[0].value.atSpaces;
    expect(atSpaces).toHaveBeenCalledWith(['space-x'], expect.anything());
    expect(atSpaces).not.toHaveBeenCalledWith(
      expect.arrayContaining(['primary-space']),
      expect.anything()
    );
  });

  it('returns all destination spaces for a primary-space upgrade (used to cap propagation)', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/security_rule/my-rule.json' }])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    const installation = {
      attributes: {
        installed_kibana_space_id: mockSpaceId,
        additional_spaces_installed_kibana: { 'space-a': [], 'space-b': [] },
      },
    } as any;

    const result = await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      mockSpaceId,
      'mypackage',
      installation
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

    const installation = {
      attributes: {
        installed_kibana_space_id: 'primary-space',
        additional_spaces_installed_kibana: { 'space-x': [], 'space-y': [] },
      },
    } as any;

    const result = await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      'space-x',
      'mypackage',
      installation
    );

    expect(result).toEqual(['space-x']);
  });

  it('checks privileges when archive has no gated types but existing install has security_rule refs (gated-to-benign removal)', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/dashboard/my-dashboard.json' }])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    const installation = {
      attributes: {
        installed_kibana_space_id: mockSpaceId,
        installed_kibana: [{ id: 'old-rule', type: 'security-rule', version: 1 }],
        additional_spaces_installed_kibana: {},
      },
    } as any;

    const result = await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      mockSpaceId,
      'mypackage',
      installation
    );

    expect(security.authz.checkPrivilegesWithRequest).toHaveBeenCalled();
    const atSpaces = security.authz.checkPrivilegesWithRequest.mock.results[0].value.atSpaces;
    expect(atSpaces).toHaveBeenCalledWith(
      [mockSpaceId],
      expect.objectContaining({ kibana: expect.arrayContaining(['api:rules-all']) })
    );
    expect(result).toEqual([mockSpaceId]);
  });

  it('throws FleetUnauthorizedError when caller lacks privileges to remove gated types', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/dashboard/my-dashboard.json' }])
    );

    const security = makeSecurity(false, ['api:rules-all']);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    const installation = {
      attributes: {
        installed_kibana_space_id: mockSpaceId,
        installed_kibana: [{ id: 'old-rule', type: 'security-rule', version: 1 }],
        additional_spaces_installed_kibana: {},
      },
    } as any;

    await expect(
      checkUploadPackageAssetPrivileges(
        mockRequest,
        mockArchiveBuffer,
        mockContentType,
        mockSpaceId,
        'mypackage',
        installation
      )
    ).rejects.toThrow(FleetUnauthorizedError);
  });

  it('skips privilege check when archive and existing install both have no gated types', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/dashboard/my-dashboard.json' }])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    const installation = {
      attributes: {
        installed_kibana_space_id: mockSpaceId,
        installed_kibana: [{ id: 'my-dashboard', type: 'dashboard', version: 1 }],
        additional_spaces_installed_kibana: {},
      },
    } as any;

    const result = await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      mockSpaceId,
      'mypackage',
      installation
    );

    expect(result).toEqual([]);
    expect(security.authz.checkPrivilegesWithRequest).not.toHaveBeenCalled();
  });

  it('reads installed_kibana (not additional-Space refs) when detecting gated types to remove for a streaming package', async () => {
    // Streaming packages save all refs to installed_kibana regardless of Space
    // (saveKibanaAssetsRefs is called without saveAsAdditionnalSpace).
    // cleanUpUnusedKibanaAssetsStep reads installed_kibana unconditionally.
    // Preflight must read the same source — otherwise additional_spaces_installed_kibana[spaceId]
    // is empty, the check is skipped, and cleanup removes the security rule via internal client.
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'security_detection_engine-1.0.0/kibana/dashboard/my-dashboard.json' }])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    const installation = {
      attributes: {
        installed_kibana_space_id: 'primary-space',
        // Streaming wrote the ref to installed_kibana (primary), not additional Space refs.
        installed_kibana: [{ id: 'existing-rule', type: 'security-rule', version: 1 }],
        additional_spaces_installed_kibana: {
          'request-space': [], // empty — streaming never writes here
        },
      },
    } as any;

    const result = await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      'request-space',
      'security_detection_engine',
      installation
    );

    // Must detect the security-rule in installed_kibana and require rules-all.
    expect(security.authz.checkPrivilegesWithRequest).toHaveBeenCalled();
    const atSpaces = security.authz.checkPrivilegesWithRequest.mock.results[0].value.atSpaces;
    expect(atSpaces).toHaveBeenCalledWith(
      ['request-space'],
      expect.objectContaining({ kibana: expect.arrayContaining(['api:rules-all']) })
    );
    expect(result).toEqual(['request-space']);
  });

  it('checks only the request space for a streaming package even when installed in additional spaces', async () => {
    // security_detection_engine uses streaming install, which writes only to the request Space.
    // Preflight must mirror that — do not require privileges in the other Spaces.
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'security_detection_engine-1.0.0/kibana/security_rule/my-rule.json' }])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    const installation = {
      attributes: {
        installed_kibana_space_id: mockSpaceId,
        additional_spaces_installed_kibana: { 'space-a': [], 'space-b': [] },
      },
    } as any;

    const result = await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      mockSpaceId,
      'security_detection_engine',
      installation
    );

    expect(result).toEqual([mockSpaceId]);

    const atSpaces = security.authz.checkPrivilegesWithRequest.mock.results[0].value.atSpaces;
    expect(atSpaces).toHaveBeenCalledWith([mockSpaceId], expect.anything());
    expect(atSpaces).not.toHaveBeenCalledWith(
      expect.arrayContaining(['space-a']),
      expect.anything()
    );
  });

  it('checks privileges when benign archive would remove gated asset in an additional Space', async () => {
    // Regression: installed_kibana (primary Space) has no security_rule, but
    // additional_spaces_installed_kibana['space-a'] does. A primary-space benign
    // upload fans out to space-a and cleanUpUnusedKibanaAssetsStep would delete
    // the security-rule SO there. Preflight must detect this and require rules-all.
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/dashboard/my-dashboard.json' }])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    const installation = {
      attributes: {
        installed_kibana_space_id: mockSpaceId,
        installed_kibana: [{ id: 'my-dashboard', type: 'dashboard', version: 1 }],
        additional_spaces_installed_kibana: {
          'space-a': [{ id: 'old-rule', type: 'security-rule', version: 1 }],
        },
      },
    } as any;

    const result = await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      mockSpaceId,
      'mypackage',
      installation
    );

    expect(security.authz.checkPrivilegesWithRequest).toHaveBeenCalled();
    const atSpaces = security.authz.checkPrivilegesWithRequest.mock.results[0].value.atSpaces;
    // Per-space: only space-a has gated types; primary space (benign) needs no rules-all check.
    expect(atSpaces).toHaveBeenCalledWith(
      ['space-a'],
      expect.objectContaining({ kibana: expect.arrayContaining(['api:rules-all']) })
    );
    expect(atSpaces).not.toHaveBeenCalledWith(
      expect.arrayContaining([mockSpaceId]),
      expect.anything()
    );
    expect(result).toEqual(expect.arrayContaining([mockSpaceId, 'space-a']));
  });

  it('checks each Space against only its own gated types, not the global union across Spaces', async () => {
    // space-a has an existing security_rule, space-b has an existing security_ai_prompt.
    // Archive is benign. The global-union approach would require rules-all + elasticAssistant
    // in both spaces, rejecting a caller who has each privilege in only its own Space.
    // Per-space: space-a needs only rules-all, space-b needs only elasticAssistant.
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/dashboard/my-dashboard.json' }])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    const installation = {
      attributes: {
        installed_kibana_space_id: mockSpaceId,
        installed_kibana: [{ id: 'dash-1', type: 'dashboard', version: 1 }],
        additional_spaces_installed_kibana: {
          'space-a': [{ id: 'old-rule', type: 'security-rule', version: 1 }],
          'space-b': [{ id: 'old-prompt', type: 'security-ai-prompt', version: 1 }],
        },
      },
    } as any;

    await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      mockSpaceId,
      'mypackage',
      installation
    );

    const atSpaces = security.authz.checkPrivilegesWithRequest.mock.results[0].value.atSpaces;
    // Two separate atSpaces calls — one per unique action set.
    expect(atSpaces).toHaveBeenCalledTimes(2);
    expect(atSpaces).toHaveBeenCalledWith(
      ['space-a'],
      expect.objectContaining({ kibana: ['api:rules-all'] })
    );
    expect(atSpaces).toHaveBeenCalledWith(
      ['space-b'],
      expect.objectContaining({ kibana: ['api:elasticAssistant'] })
    );
  });

  it('skips privilege check when benign archive and additional Space refs are all non-gated', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/dashboard/my-dashboard.json' }])
    );

    const security = makeSecurity(true);
    (appContextService.getSecurity as jest.Mock).mockReturnValue(security);

    const installation = {
      attributes: {
        installed_kibana_space_id: mockSpaceId,
        installed_kibana: [{ id: 'dash-1', type: 'dashboard', version: 1 }],
        additional_spaces_installed_kibana: {
          'space-a': [{ id: 'dash-2', type: 'dashboard', version: 1 }],
        },
      },
    } as any;

    const result = await checkUploadPackageAssetPrivileges(
      mockRequest,
      mockArchiveBuffer,
      mockContentType,
      mockSpaceId,
      'mypackage',
      installation
    );

    expect(result).toEqual([]);
    expect(security.authz.checkPrivilegesWithRequest).not.toHaveBeenCalled();
  });
});
