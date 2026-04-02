/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { ToolResultType } from '@kbn/agent-builder-common';
import { runSearchTool } from '@kbn/agent-builder-genai-utils/tools';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';

import { casesAnalyticsTool, getCasesAnalyticsIndexPattern, CASES_ANALYTICS_TOOL_ID } from '.';
import { OWNERS } from '../../../common/constants';
import { ReadOperations } from '../../authorization/types';

jest.mock('@kbn/agent-builder-genai-utils/tools', () => ({
  runSearchTool: jest.fn(),
}));

const mockRunSearchTool = runSearchTool as jest.Mock;

/**
 * Builds a mock security authz object whose checkPrivileges handler returns
 * the provided authorized flag for each owner privilege checked.
 */
const createMockSecurityAuthz = (authorized: boolean) => {
  const privilege = { authorized };
  const kibanaPrivileges = OWNERS.map(() => privilege);
  const checkPrivileges = jest.fn().mockResolvedValue({
    privileges: { kibana: kibanaPrivileges },
  });
  return {
    checkPrivilegesDynamicallyWithRequest: jest.fn().mockReturnValue(checkPrivileges),
    actions: {
      cases: {
        get: jest.fn((owner: string, operation: string) => `cases:${owner}/${operation}`),
      },
    },
  };
};

describe('getCasesAnalyticsIndexPattern', () => {
  it('returns a comma-separated list of explicit internal index names for the space', () => {
    const pattern = getCasesAnalyticsIndexPattern('default');
    // Should be a comma-separated list (not a wildcard), allowing resolveIndex
    // to find hidden indices by exact name regardless of expand_wildcards setting.
    expect(pattern).toContain(',');
    expect(pattern).not.toContain('*');
  });

  it('includes all four index types for every owner', () => {
    const pattern = getCasesAnalyticsIndexPattern('default');
    const parts = pattern.split(',');
    // 3 owners × 4 index types = 12 explicit index names
    expect(parts).toHaveLength(12);
  });

  it('scopes all entries to the given spaceId', () => {
    const pattern = getCasesAnalyticsIndexPattern('my-space');
    const parts = pattern.split(',');
    parts.forEach((part) => {
      expect(part).toContain('my-space');
    });
  });

  it('produces an isIndexPattern-compatible string (contains comma)', () => {
    // The runSearchTool graph uses isIndexPattern() to decide whether to use
    // the allowPatternTarget code path. It checks for '*' or ','.
    const pattern = getCasesAnalyticsIndexPattern('default');
    expect(pattern.includes(',') || pattern.includes('*')).toBe(true);
  });
});

describe('casesAnalyticsTool', () => {
  const mockCore = coreMock.createSetup();
  const mockLogger = loggingSystemMock.createLogger();
  const mockRequest = httpServerMock.createKibanaRequest();

  const tool = casesAnalyticsTool(mockCore as any, mockLogger);

  const createHandlerContext = (spaceId = 'default') => {
    const base = agentBuilderMocks.tools.createHandlerContext();
    return {
      ...base,
      request: mockRequest,
      spaceId,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('tool properties', () => {
    it('has the correct tool id', () => {
      expect(tool.id).toBe(CASES_ANALYTICS_TOOL_ID);
    });

    it('has the expected tags', () => {
      expect(tool.tags).toEqual(['cases', 'analytics']);
    });

    it('has a description', () => {
      expect(typeof tool.description).toBe('string');
      expect(tool.description.length).toBeGreaterThan(0);
    });

    it('does not define an availability handler', () => {
      expect(tool.availability).toBeUndefined();
    });
  });

  describe('schema', () => {
    it('accepts a valid query string', () => {
      const result = tool.schema.safeParse({ query: 'how many open cases' });
      expect(result.success).toBe(true);
    });

    it('rejects missing query field', () => {
      const result = tool.schema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects a non-string query', () => {
      const result = tool.schema.safeParse({ query: 42 });
      expect(result.success).toBe(false);
    });

    it('strips extra unknown fields', () => {
      const result = tool.schema.safeParse({ query: 'test', extraField: true });
      expect(result.success).toBe(true);
    });
  });

  describe('handler RBAC gate', () => {
    it('throws Boom.forbidden when user has no Cases read privilege for any owner', async () => {
      // FAILURE SCENARIO: user is authenticated but lacks Cases privilege for all owners
      const mockSecurityAuthz = createMockSecurityAuthz(false);
      mockCore.getStartServices.mockResolvedValue([
        coreMock.createStart(),
        { security: { authz: mockSecurityAuthz } },
        {},
      ]);

      const ctx = createHandlerContext();

      await expect(tool.handler({ query: 'test' }, ctx)).rejects.toThrow(Boom.Boom);
      await expect(tool.handler({ query: 'test' }, ctx)).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
    });

    it('checks Cases findCases privilege for all owners', async () => {
      // FAILURE SCENARIO: verifying that the right privileges are checked
      const mockSecurityAuthz = createMockSecurityAuthz(false);
      mockCore.getStartServices.mockResolvedValue([
        coreMock.createStart(),
        { security: { authz: mockSecurityAuthz } },
        {},
      ]);

      const ctx = createHandlerContext();
      try {
        await tool.handler({ query: 'test' }, ctx);
      } catch {}

      const actionsGet = mockSecurityAuthz.actions.cases.get;
      expect(actionsGet).toHaveBeenCalledTimes(OWNERS.length);
      OWNERS.forEach((owner) => {
        expect(actionsGet).toHaveBeenCalledWith(owner, ReadOperations.FindCases);
      });
    });

    it('does not call runSearchTool when access is denied', async () => {
      const mockSecurityAuthz = createMockSecurityAuthz(false);
      mockCore.getStartServices.mockResolvedValue([
        coreMock.createStart(),
        { security: { authz: mockSecurityAuthz } },
        {},
      ]);

      const ctx = createHandlerContext();
      try {
        await tool.handler({ query: 'test' }, ctx);
      } catch {}

      expect(mockRunSearchTool).not.toHaveBeenCalled();
    });
  });

  describe('handler happy path', () => {
    const mockResults = [{ type: ToolResultType.other, data: 'cases summary' }];

    beforeEach(() => {
      const mockSecurityAuthz = createMockSecurityAuthz(true);
      mockCore.getStartServices.mockResolvedValue([
        coreMock.createStart(),
        { security: { authz: mockSecurityAuthz } },
        {},
      ]);
      mockRunSearchTool.mockResolvedValue(mockResults);
    });

    it('calls runSearchTool with the correct index pattern for the active space', async () => {
      const spaceId = 'prod-space';
      const ctx = createHandlerContext(spaceId);

      await tool.handler({ query: 'open cases by severity' }, ctx);

      expect(mockRunSearchTool).toHaveBeenCalledWith(
        expect.objectContaining({
          index: expect.stringContaining(spaceId),
        })
      );
      const callArgs = mockRunSearchTool.mock.calls[0][0];
      // Comma-separated list, not a wildcard, so hidden indices are resolved by exact name
      expect(callArgs.index).toContain(',');
      expect(callArgs.index).not.toContain('*');
    });

    it('calls runSearchTool with asInternalUser', async () => {
      const ctx = createHandlerContext();

      await tool.handler({ query: 'test query' }, ctx);

      expect(mockRunSearchTool).toHaveBeenCalledWith(
        expect.objectContaining({
          esClient: ctx.esClient.asInternalUser,
        })
      );
    });

    it('passes allowPatternTarget: true so ES|QL queries the comma-separated pattern', async () => {
      const ctx = createHandlerContext();

      await tool.handler({ query: 'test' }, ctx);

      expect(mockRunSearchTool).toHaveBeenCalledWith(
        expect.objectContaining({
          allowPatternTarget: true,
        })
      );
    });

    it('returns the results from runSearchTool', async () => {
      const ctx = createHandlerContext();

      const result = await tool.handler({ query: 'count cases' }, ctx);

      expect(result).toEqual({ results: mockResults });
    });

    it('passes the natural language query to runSearchTool', async () => {
      const ctx = createHandlerContext();
      const nlQuery = 'how many critical cases were resolved last week';

      await tool.handler({ query: nlQuery }, ctx);

      expect(mockRunSearchTool).toHaveBeenCalledWith(expect.objectContaining({ nlQuery }));
    });

    it('includes the exact index pattern in customInstructions so the LLM uses correct FROM clauses', async () => {
      const ctx = createHandlerContext('my-space');

      await tool.handler({ query: 'test' }, ctx);

      const callArgs = mockRunSearchTool.mock.calls[0][0];
      expect(callArgs.customInstructions).toContain(`FROM ${callArgs.index}`);
    });

    it('uses default as spaceId when context provides it', async () => {
      const ctx = createHandlerContext('default');

      await tool.handler({ query: 'test' }, ctx);

      expect(mockRunSearchTool).toHaveBeenCalledWith(
        expect.objectContaining({ index: expect.stringContaining('default') })
      );
    });
  });
});
