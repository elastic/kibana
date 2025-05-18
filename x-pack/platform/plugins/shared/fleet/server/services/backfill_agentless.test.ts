/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { backfillPackagePolicySupportsAgentless } from './backfill_agentless';
import { packagePolicyService } from './package_policy';

jest.mock('.', () => ({
  appContextService: {
    getLogger: () => ({
      debug: jest.fn(),
    }),
    getInternalUserSOClientForSpaceId: jest.fn(),
    getInternalUserSOClientWithoutSpaceExtension: () => ({
      find: jest.fn().mockImplementation((options) => {
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
                },
              },
            ],
          };
        }
      }),
    }),
  },
}));

jest.mock('./package_policy', () => ({
  packagePolicyService: {
    update: jest.fn(),
  },
  getPackagePolicySavedObjectType: jest.fn().mockResolvedValue('ingest-package-policies'),
}));

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
