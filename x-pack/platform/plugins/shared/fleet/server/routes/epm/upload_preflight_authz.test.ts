/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

import { KibanaAssetType } from '../../../common/types/models/epm';
import { FleetUnauthorizedError } from '../../errors';
import { appContextService } from '../../services';
import { createArchiveIterator } from '../../services/epm/archive/archive_iterator';

import {
  checkUploadPackageAssetPrivileges,
  collectArchiveSignals,
  buildRequiredActions,
} from './upload_preflight_authz';

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

  it('detects csp_rule_template as gated type', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/csp_rule_template/my-rule.json' }])
    );

    const signals = await collectArchiveSignals(mockArchiveBuffer, mockContentType);

    expect(signals.gatedTypesFound.has('csp_rule_template' as any)).toBe(true);
    expect(signals.blockedTypes).toHaveLength(0);
  });

  it('detects slo_template as gated type', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/slo_template/my-slo.json' }])
    );

    const signals = await collectArchiveSignals(mockArchiveBuffer, mockContentType);

    expect(signals.gatedTypesFound.has('slo_template' as any)).toBe(true);
    expect(signals.blockedTypes).toHaveLength(0);
  });

  it('places alerting_rule_template in blockedTypes (no user-facing write privilege)', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/alerting_rule_template/my-alert.json' }])
    );

    const signals = await collectArchiveSignals(mockArchiveBuffer, mockContentType);

    expect(signals.gatedTypesFound.has('alerting_rule_template' as any)).toBe(false);
    expect(signals.blockedTypes).toContain('alerting_rule_template');
  });
});

describe('buildRequiredActions', () => {
  const security = makeSecurity(true);

  it('returns rules-all for security_rule type', () => {
    const signals = {
      gatedTypesFound: new Set<KibanaAssetType>([KibanaAssetType.securityRule]),
      blockedTypes: [],
      hasMlSecurityRules: false,
    };

    expect(buildRequiredActions(signals, security as any)).toContain('api:rules-all');
  });

  it('adds ml:canCreateJob when hasMlSecurityRules is true', () => {
    const signals = {
      gatedTypesFound: new Set<KibanaAssetType>([KibanaAssetType.securityRule]),
      blockedTypes: [],
      hasMlSecurityRules: true,
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
    };

    expect(buildRequiredActions(signals, security as any)).toContain('api:elasticAssistant');
  });

  it('returns cloud-security-posture-all for csp_rule_template', () => {
    const signals = {
      gatedTypesFound: new Set<KibanaAssetType>([KibanaAssetType.cloudSecurityPostureRuleTemplate]),
      blockedTypes: [],
      hasMlSecurityRules: false,
    };

    expect(buildRequiredActions(signals, security as any)).toContain(
      'api:cloud-security-posture-all'
    );
  });

  it('returns slo_write for slo_template', () => {
    const signals = {
      gatedTypesFound: new Set<KibanaAssetType>([KibanaAssetType.sloTemplate]),
      blockedTypes: [],
      hasMlSecurityRules: false,
    };

    expect(buildRequiredActions(signals, security as any)).toContain('api:slo_write');
  });

  it('accumulates actions for multiple gated types', () => {
    const signals = {
      gatedTypesFound: new Set<KibanaAssetType>([
        KibanaAssetType.securityRule,
        KibanaAssetType.securityAIPrompt,
        KibanaAssetType.osquerySavedQuery,
      ]),
      blockedTypes: [],
      hasMlSecurityRules: true,
    };

    const actions = buildRequiredActions(signals, security as any);
    expect(actions).toContain('api:rules-all');
    expect(actions).toContain('api:elasticAssistant');
    expect(actions).toContain('api:osquery-writeSavedQueries');
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
        mockSpaceId
      )
    ).resolves.toBeUndefined();

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
      mockSpaceId
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
      mockSpaceId
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
        mockSpaceId
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
        mockSpaceId
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
      mockSpaceId
    );

    const atSpaces = security.authz.checkPrivilegesWithRequest.mock.results[0].value.atSpaces;
    expect(atSpaces).toHaveBeenCalledWith(
      [mockSpaceId],
      expect.objectContaining({ kibana: expect.arrayContaining(['api:elasticAssistant']) })
    );
  });

  it('checks osquery-writeSavedQueries for osquery_saved_query package', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/osquery_saved_query/my-query.json' }])
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
      expect.objectContaining({ kibana: expect.arrayContaining(['api:osquery-writeSavedQueries']) })
    );
  });

  it('checks osquery-writePacks for osquery_pack_asset package', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/osquery_pack_asset/my-pack.json' }])
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
      expect.objectContaining({ kibana: expect.arrayContaining(['api:osquery-writePacks']) })
    );
  });

  it('checks ml:canCreateJob for ml_module package', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/ml_module/my-module.json' }])
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
      expect.objectContaining({ kibana: expect.arrayContaining(['api:ml:canCreateJob']) })
    );
  });

  it('accumulates union of required actions for mixed gated types', async () => {
    const mlRuleBuffer = makeAssetBuffer({ type: 'machine_learning' });
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([
        { path: 'mypackage-1.0.0/kibana/security_rule/my-rule.json', buffer: mlRuleBuffer },
        { path: 'mypackage-1.0.0/kibana/security_ai_prompt/my-prompt.json' },
        { path: 'mypackage-1.0.0/kibana/osquery_saved_query/my-query.json' },
        { path: 'mypackage-1.0.0/kibana/dashboard/my-dashboard.json' },
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
          'api:ml:canCreateJob',
          'api:elasticAssistant',
          'api:osquery-writeSavedQueries',
        ]),
      })
    );
  });

  it('checks cloud-security-posture-all for csp_rule_template package', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/csp_rule_template/my-rule.json' }])
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
        kibana: expect.arrayContaining(['api:cloud-security-posture-all']),
      })
    );
  });

  it('throws FleetUnauthorizedError when caller lacks cloud-security-posture-all for csp_rule_template package', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/csp_rule_template/my-rule.json' }])
    );
    (appContextService.getSecurity as jest.Mock).mockReturnValue(
      makeSecurity(false, ['api:cloud-security-posture-all'])
    );

    await expect(
      checkUploadPackageAssetPrivileges(
        mockRequest,
        mockArchiveBuffer,
        mockContentType,
        mockSpaceId
      )
    ).rejects.toThrow(FleetUnauthorizedError);
  });

  it('checks slo_write for slo_template package', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/slo_template/my-slo.json' }])
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
      expect.objectContaining({ kibana: expect.arrayContaining(['api:slo_write']) })
    );
  });

  it('throws FleetUnauthorizedError when caller lacks slo_write for slo_template package', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/slo_template/my-slo.json' }])
    );
    (appContextService.getSecurity as jest.Mock).mockReturnValue(
      makeSecurity(false, ['api:slo_write'])
    );

    await expect(
      checkUploadPackageAssetPrivileges(
        mockRequest,
        mockArchiveBuffer,
        mockContentType,
        mockSpaceId
      )
    ).rejects.toThrow(FleetUnauthorizedError);
  });

  it('blocks upload containing alerting_rule_template regardless of caller privileges', async () => {
    (createArchiveIterator as jest.Mock).mockReturnValue(
      makeIterator([{ path: 'mypackage-1.0.0/kibana/alerting_rule_template/my-alert.json' }])
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
    ).rejects.toThrow(FleetUnauthorizedError);

    expect(security.authz.checkPrivilegesWithRequest).not.toHaveBeenCalled();
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
        mockSpaceId
      )
    ).rejects.toThrow(FleetUnauthorizedError);
  });
});
