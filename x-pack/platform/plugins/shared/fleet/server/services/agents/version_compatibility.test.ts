/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { createSavedObjectClientMock } from '../../mocks';
import type { Agent } from '../../../common/types/models/agent';

import { fetchAllAgentsByKuery } from './crud';
import {
  isAnyAgentBelowRequiredVersion,
  extractMinVersionFromRange,
  extractMinVersionFromRangeWithOr,
  extractMinVersionFromRanges,
} from './version_compatibility';

jest.mock('./crud');

const mockFetchAllAgentsByKuery = fetchAllAgentsByKuery as jest.MockedFunction<
  typeof fetchAllAgentsByKuery
>;

// Helper function to create valid Agent mock objects
const createMockAgent = (overrides: Partial<Agent> = {}): Agent => ({
  id: 'agent-1',
  type: 'PERMANENT',
  active: true,
  enrolled_at: '2023-01-01T00:00:00Z',
  packages: [],
  agent: { id: 'agent-1', version: '8.12.0' },
  local_metadata: {
    elastic: {
      agent: { version: '8.12.0' },
    },
  },
  ...overrides,
});

describe('isAnyAgentBelowRequiredVersion', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let esClient: jest.Mocked<ElasticsearchClient>;

  beforeEach(() => {
    soClient = createSavedObjectClientMock();
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.clearAllMocks();
  });

  it('should return false when no policy IDs are provided', async () => {
    const result = await isAnyAgentBelowRequiredVersion({
      esClient,
      soClient,
      policyIds: [],
      requiredVersion: '8.12.0',
    });

    expect(result).toBe(false);
    expect(mockFetchAllAgentsByKuery).not.toHaveBeenCalled();
  });

  it('should return false when no agents are found', async () => {
    mockFetchAllAgentsByKuery.mockResolvedValue(
      (async function* () {
        // Empty iterator - no agents
      })()
    );

    const result = await isAnyAgentBelowRequiredVersion({
      esClient,
      soClient,
      policyIds: ['policy-1'],
      requiredVersion: '8.12.0',
    });

    expect(result).toBe(false);
    expect(mockFetchAllAgentsByKuery).toHaveBeenCalledWith(esClient, soClient, {
      kuery: 'policy_id: ("policy-1")',
      spaceId: undefined,
    });
  });

  it('should return false when all agents meet the version requirement', async () => {
    mockFetchAllAgentsByKuery.mockResolvedValue(
      (async function* () {
        yield [
          createMockAgent({
            id: 'agent-1',
            agent: { id: 'agent-1', version: '8.12.0' },
          }),
          createMockAgent({
            id: 'agent-2',
            agent: { id: 'agent-2', version: '8.13.0' },
          }),
        ];
      })()
    );

    const result = await isAnyAgentBelowRequiredVersion({
      esClient,
      soClient,
      policyIds: ['policy-1'],
      requiredVersion: '>=8.12.0',
    });

    expect(result).toBe(false);
  });

  it('should return true when at least one agent is below the required version', async () => {
    mockFetchAllAgentsByKuery.mockResolvedValue(
      (async function* () {
        yield [
          createMockAgent({
            id: 'agent-1',
            agent: { id: 'agent-1', version: '8.11.0' },
          }),
          createMockAgent({
            id: 'agent-2',
            agent: { id: 'agent-2', version: '8.13.0' },
          }),
        ];
      })()
    );

    const result = await isAnyAgentBelowRequiredVersion({
      esClient,
      soClient,
      policyIds: ['policy-1'],
      requiredVersion: '8.12.0',
    });

    expect(result).toBe(true);
  });

  it('should handle multiple policy IDs in kuery', async () => {
    mockFetchAllAgentsByKuery.mockResolvedValue(
      (async function* () {
        yield [
          createMockAgent({
            id: 'agent-1',
            agent: { id: 'agent-1', version: '8.11.0' },
          }),
        ];
      })()
    );

    const result = await isAnyAgentBelowRequiredVersion({
      esClient,
      soClient,
      policyIds: ['policy-1', 'policy-2', 'policy-3'],
      requiredVersion: '8.12.0',
    });

    expect(result).toBe(true);
    expect(mockFetchAllAgentsByKuery).toHaveBeenCalledWith(esClient, soClient, {
      kuery: 'policy_id: ("policy-1" or "policy-2" or "policy-3")',
      spaceId: undefined,
    });
  });

  it('should pass spaceId to fetchAllAgentsByKuery', async () => {
    mockFetchAllAgentsByKuery.mockResolvedValue(
      (async function* () {
        yield [];
      })()
    );

    await isAnyAgentBelowRequiredVersion({
      esClient,
      soClient,
      policyIds: ['policy-1'],
      requiredVersion: '8.12.0',
      spaceId: 'custom-space',
    });

    expect(mockFetchAllAgentsByKuery).toHaveBeenCalledWith(esClient, soClient, {
      kuery: 'policy_id: ("policy-1")',
      spaceId: 'custom-space',
    });
  });

  it('should handle multiple batches of agents', async () => {
    mockFetchAllAgentsByKuery.mockResolvedValue(
      (async function* () {
        yield [
          createMockAgent({
            id: 'agent-1',
            agent: { id: 'agent-1', version: '8.13.0' },
          }),
        ];
        yield [
          createMockAgent({
            id: 'agent-2',
            agent: { id: 'agent-2', version: '8.11.0' },
          }),
        ];
      })()
    );

    const result = await isAnyAgentBelowRequiredVersion({
      esClient,
      soClient,
      policyIds: ['policy-1'],
      requiredVersion: '8.12.0',
    });

    expect(result).toBe(true);
  });

  it('should handle semver comparison correctly for different version formats', async () => {
    const testCases = [
      { agentVersion: '8.11.9', requiredVersion: '>=8.12.0', expected: true },
      { agentVersion: '8.12.0', requiredVersion: '>=8.12.0', expected: false },
      { agentVersion: '8.12.1', requiredVersion: '>=8.12.0', expected: false },
      { agentVersion: '8.13.0', requiredVersion: '>=8.12.0', expected: false },
      { agentVersion: '9.0.0', requiredVersion: '>=8.12.0', expected: false },
    ];

    for (const testCase of testCases) {
      mockFetchAllAgentsByKuery.mockResolvedValue(
        (async function* () {
          yield [
            createMockAgent({
              id: 'agent-1',
              agent: { id: 'agent-1', version: testCase.agentVersion },
            }),
          ];
        })()
      );

      const result = await isAnyAgentBelowRequiredVersion({
        esClient,
        soClient,
        policyIds: ['policy-1'],
        requiredVersion: testCase.requiredVersion,
      });

      expect(result).toBe(testCase.expected);
    }
  });

  it('should handle semver range formats like ^ and ~', async () => {
    mockFetchAllAgentsByKuery.mockResolvedValue(
      (async function* () {
        yield [
          createMockAgent({
            id: 'agent-1',
            agent: { id: 'agent-1', version: '8.11.0' },
          }),
        ];
      })()
    );

    // Agent 8.11.0 does not satisfy ^8.12.0
    const result1 = await isAnyAgentBelowRequiredVersion({
      esClient,
      soClient,
      policyIds: ['policy-1'],
      requiredVersion: '^8.12.0',
    });
    expect(result1).toBe(true);

    // Reset and test with a compatible version
    mockFetchAllAgentsByKuery.mockResolvedValue(
      (async function* () {
        yield [
          createMockAgent({
            id: 'agent-1',
            agent: { id: 'agent-1', version: '8.12.5' },
          }),
        ];
      })()
    );

    // Agent 8.12.5 satisfies ^8.12.0
    const result2 = await isAnyAgentBelowRequiredVersion({
      esClient,
      soClient,
      policyIds: ['policy-1'],
      requiredVersion: '^8.12.0',
    });
    expect(result2).toBe(false);
  });
});

describe('extractMinVersionFromRange', () => {
  it('should extract minimum version from simple range', () => {
    expect(extractMinVersionFromRange('^8.12.0')).toBe('8.12.0');
    expect(extractMinVersionFromRange('>=8.13.0')).toBe('8.13.0');
    expect(extractMinVersionFromRange('~9.0.0')).toBe('9.0.0');
  });

  it('should return undefined for invalid ranges', () => {
    expect(extractMinVersionFromRange('invalid')).toBeUndefined();
    expect(extractMinVersionFromRange('')).toBeUndefined();
  });
});

describe('extractMinVersionFromRangeWithOr', () => {
  it('should extract minimum version from OR range', () => {
    // For "^8.13.0 || ^9.0.0", the minimum is 8.13.0
    expect(extractMinVersionFromRangeWithOr('^8.13.0 || ^9.0.0')).toBe('8.13.0');
    // For "^8.11.0 || ^9.0.0", the minimum is 8.11.0
    expect(extractMinVersionFromRangeWithOr('^8.11.0 || ^9.0.0')).toBe('8.11.0');
  });

  it('should handle single range without OR', () => {
    expect(extractMinVersionFromRangeWithOr('^8.12.0')).toBe('8.12.0');
  });

  it('should return undefined for invalid ranges', () => {
    expect(extractMinVersionFromRangeWithOr('invalid || also-invalid')).toBeUndefined();
  });
});

describe('extractMinVersionFromRanges', () => {
  it('should extract the highest minimum version from multiple ranges', () => {
    // When package 1 requires ^8.11.0 and package 2 requires ^8.13.0,
    // the minimum should be 8.13.0 (the highest/most restrictive)
    const ranges = ['^8.11.0', '^8.13.0'];
    expect(extractMinVersionFromRanges(ranges)).toBe('8.13.0');
  });

  it('should handle ranges with OR clauses', () => {
    // Package 1: ^8.11.0 || ^9.0.0 (min: 8.11.0)
    // Package 2: ^8.13.0 (min: 8.13.0)
    // Result should be 8.13.0 (highest)
    const ranges = ['^8.11.0 || ^9.0.0', '^8.13.0'];
    expect(extractMinVersionFromRanges(ranges)).toBe('8.13.0');
  });

  it('should return undefined for empty array', () => {
    expect(extractMinVersionFromRanges([])).toBeUndefined();
  });

  it('should return undefined when all ranges are invalid', () => {
    expect(extractMinVersionFromRanges(['invalid', 'also-invalid'])).toBeUndefined();
  });

  it('should handle single range', () => {
    expect(extractMinVersionFromRanges(['^8.12.0'])).toBe('8.12.0');
  });

  it('should handle multiple OR ranges and select highest minimum', () => {
    // Package 1: ^8.10.0 || ^9.0.0 (min: 8.10.0)
    // Package 2: ^8.12.0 || ^9.1.0 (min: 8.12.0)
    // Package 3: ^8.15.0 (min: 8.15.0)
    // Result should be 8.15.0 (highest)
    const ranges = ['^8.10.0 || ^9.0.0', '^8.12.0 || ^9.1.0', '^8.15.0'];
    expect(extractMinVersionFromRanges(ranges)).toBe('8.15.0');
  });

  it('should filter out invalid ranges and process valid ones', () => {
    // Mix of valid and invalid ranges
    const ranges = ['invalid', '^8.12.0', 'also-invalid', '^8.13.0'];
    expect(extractMinVersionFromRanges(ranges)).toBe('8.13.0');
  });
});
