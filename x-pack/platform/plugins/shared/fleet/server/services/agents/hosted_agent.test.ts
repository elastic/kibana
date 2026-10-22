/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import type { Agent } from '../../types';
import { agentPolicyService } from '../agent_policy';

import {
  getAgentPolicyRestrictions,
  isAgentlessAgent,
  isHostedAgent,
  throwIfAgentInAgentlessPolicy,
  throwIfAgentlessAgentPolicy,
} from './hosted_agent';

jest.mock('../agent_policy', () => {
  return {
    agentPolicyService: {
      get: jest.fn(),
      getByIds: jest.fn().mockResolvedValue([
        { id: 'hosted-policy', is_managed: true },
        { id: 'regular-policy', is_managed: false },
        { id: 'agentless-policy', is_managed: false, supports_agentless: true },
      ]),
    },
  };
});

describe('hosted agent helpers', () => {
  const soClientMock = savedObjectsClientMock.create();
  const expectedHostedPolicies = {
    'hosted-policy': { is_managed: true, supports_agentless: false },
    'regular-policy': { is_managed: false, supports_agentless: false },
    'agentless-policy': { is_managed: false, supports_agentless: true },
  };

  it('should query unique managed policies', async () => {
    const result = await getAgentPolicyRestrictions(soClientMock, [
      { policy_id: 'hosted-policy', policy_base_id: 'hosted-policy' } as Agent,
      { policy_id: 'hosted-policy', policy_base_id: 'hosted-policy' } as Agent,
      { policy_id: 'regular-policy', policy_base_id: 'regular-policy' } as Agent,
      { policy_id: 'regular-policy', policy_base_id: 'regular-policy' } as Agent,
    ]);
    expect(result).toEqual(expectedHostedPolicies);
  });

  it('should return true for hosted policy', () => {
    const isHosted = isHostedAgent(expectedHostedPolicies, {
      policy_id: 'hosted-policy',
      policy_base_id: 'hosted-policy',
    } as Agent);
    expect(isHosted).toBeTruthy();
  });

  it('should return false for regular policy', () => {
    const isHosted = isHostedAgent(expectedHostedPolicies, {
      policy_id: 'regular-policy',
      policy_base_id: 'regular-policy',
    } as Agent);
    expect(isHosted).toBeFalsy();
  });

  it('should return false for missing policy_base_id', () => {
    const isHosted = isHostedAgent(expectedHostedPolicies, {} as Agent);
    expect(isHosted).toBeFalsy();
  });

  it('should return false for non existing policy', () => {
    const isHosted = isHostedAgent(expectedHostedPolicies, {
      policy_id: 'dummy-policy',
      policy_base_id: 'dummy-policy',
    } as Agent);
    expect(isHosted).toBeFalsy();
  });

  describe('version-specific variant agents', () => {
    it('getAgentPolicyRestrictions deduplicates by policy_base_id before lookup', async () => {
      const result = await getAgentPolicyRestrictions(soClientMock, [
        { policy_id: 'hosted-policy#9.2', policy_base_id: 'hosted-policy' } as Agent,
        { policy_id: 'hosted-policy#9.2', policy_base_id: 'hosted-policy' } as Agent,
        { policy_id: 'regular-policy#9.2', policy_base_id: 'regular-policy' } as Agent,
      ]);
      expect(result).toEqual(expectedHostedPolicies);
    });

    it('isHostedAgent returns true for variant agent on hosted base policy', () => {
      const isHosted = isHostedAgent(expectedHostedPolicies, {
        policy_id: 'hosted-policy#9.2',
        policy_base_id: 'hosted-policy',
      } as Agent);
      expect(isHosted).toBeTruthy();
    });

    it('isHostedAgent returns false for variant agent on non-hosted base policy', () => {
      const isHosted = isHostedAgent(expectedHostedPolicies, {
        policy_id: 'regular-policy#9.2',
        policy_base_id: 'regular-policy',
      } as Agent);
      expect(isHosted).toBeFalsy();
    });

    it('isHostedAgent returns true for variant with multi-part minor version (#9.10)', () => {
      const isHosted = isHostedAgent(expectedHostedPolicies, {
        policy_id: 'hosted-policy#9.10',
        policy_base_id: 'hosted-policy',
      } as Agent);
      expect(isHosted).toBeTruthy();
    });
  });

  describe('isAgentlessAgent', () => {
    it('returns true for an agent on an agentless policy', () => {
      expect(
        isAgentlessAgent(expectedHostedPolicies, {
          policy_id: 'agentless-policy',
          policy_base_id: 'agentless-policy',
        } as Agent)
      ).toBe(true);
    });

    it('returns true for a variant agent on an agentless base policy', () => {
      expect(
        isAgentlessAgent(expectedHostedPolicies, {
          policy_id: 'agentless-policy#9.2',
          policy_base_id: 'agentless-policy',
        } as Agent)
      ).toBe(true);
    });

    it('returns false for regular, hosted and missing policies', () => {
      expect(
        isAgentlessAgent(expectedHostedPolicies, {
          policy_id: 'regular-policy',
          policy_base_id: 'regular-policy',
        } as Agent)
      ).toBe(false);
      expect(
        isAgentlessAgent(expectedHostedPolicies, {
          policy_id: 'hosted-policy',
          policy_base_id: 'hosted-policy',
        } as Agent)
      ).toBe(false);
      expect(isAgentlessAgent(expectedHostedPolicies, {} as Agent)).toBe(false);
    });
  });

  describe('throwIfAgentlessAgentPolicy', () => {
    it('throws for an agentless policy', () => {
      expect(() =>
        throwIfAgentlessAgentPolicy({ supports_agentless: true }, 'Cannot restart agent')
      ).toThrow(/Cannot restart agent.*managed agents are managed by Elastic/);
    });

    it('does not throw for other policies', () => {
      expect(() => throwIfAgentlessAgentPolicy({ supports_agentless: false }, 'msg')).not.toThrow();
      expect(() => throwIfAgentlessAgentPolicy(undefined, 'msg')).not.toThrow();
      expect(() => throwIfAgentlessAgentPolicy(null, 'msg')).not.toThrow();
    });
  });

  describe('throwIfAgentInAgentlessPolicy', () => {
    const agentPolicyServiceMock = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

    beforeEach(() => {
      agentPolicyServiceMock.get.mockReset();
    });

    it('throws when the policy of the loaded agent is agentless', async () => {
      agentPolicyServiceMock.get.mockResolvedValue({ supports_agentless: true } as any);

      await expect(
        throwIfAgentInAgentlessPolicy(soClientMock, { policy_id: 'agentless-policy' }, 'Cannot do')
      ).rejects.toThrow(/Cannot do.*managed agents/);
      expect(agentPolicyServiceMock.get).toHaveBeenCalledWith(
        soClientMock,
        'agentless-policy',
        false
      );
    });

    it('does not throw for a regular policy, a missing policy or an agent without policy', async () => {
      agentPolicyServiceMock.get.mockResolvedValueOnce({ supports_agentless: false } as any);
      await expect(
        throwIfAgentInAgentlessPolicy(soClientMock, { policy_id: 'regular-policy' }, 'msg')
      ).resolves.toBeUndefined();

      agentPolicyServiceMock.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError('fleet-agent-policies', 'gone')
      );
      await expect(
        throwIfAgentInAgentlessPolicy(soClientMock, { policy_id: 'deleted-policy' }, 'msg')
      ).resolves.toBeUndefined();

      agentPolicyServiceMock.get.mockClear();
      await expect(throwIfAgentInAgentlessPolicy(soClientMock, {}, 'msg')).resolves.toBeUndefined();
      expect(agentPolicyServiceMock.get).not.toHaveBeenCalled();
    });
  });
});
