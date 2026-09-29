/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { backfillPackagePolicySupportsAgentless } from './backfill_agentless';
import { packagePolicyService } from './package_policy';

vi.mock('./audit_logging', () => {
  const mocked = {
    auditLoggingService: {
      writeCustomSoAuditLog: vi.fn(),
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('./settings', () => {
  const mocked = {
    getSettingsOrUndefined: () => ({
      use_space_awareness_migration_status: 'success',
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./app_context', () => {
  return {
    appContextService: {
      getExperimentalFeatures: () => ({
        useSpaceAwareness: true,
      }),
      getLogger: () => ({
        debug: vi.fn(),
      }),
      getInternalUserSOClient: vi.fn(),
      getInternalUserSOClientForSpaceId: vi.fn(),
      getInternalUserSOClientWithoutSpaceExtension: () => ({
        find: vi.fn().mockImplementation((options) => {
          if (options.type === 'ingest-agent-policies') {
            return {
              saved_objects: [{ id: 'agent_policy_1' }, { id: 'agent_policy_2' }],
            };
          } else {
            return {
              saved_objects: [
                {
                  id: 'package_policy_1',
                  attributes: {
                    inputs: [],
                    policy_ids: ['agent_policy_1'],
                    supports_agentless: false,
                    package: {
                      name: 'cloud_asset_inventory',
                      version: '0.19.0',
                    },
                  },
                },
              ],
            };
          }
        }),
      }),
    },
  };
});

vi.mock('./package_policy', () => {
  const mocked = {
    packagePolicyService: {
      update: vi.fn(),
    },
    getPackagePolicySavedObjectType: vi.fn().mockResolvedValue('ingest-package-policies'),
  };
  return { ...mocked, default: mocked };
});

describe('backfill agentless package policies', () => {
  it('should backfill package policies missing supports_agentless', async () => {
    await backfillPackagePolicySupportsAgentless(undefined as any);

    expect(packagePolicyService.update).toHaveBeenCalledWith(
      undefined,
      undefined,
      'package_policy_1',
      {
        enabled: undefined,
        inputs: [],
        name: undefined,
        policy_ids: ['agent_policy_1'],
        supports_agentless: true,
      }
    );
  });
});
