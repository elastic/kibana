/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolType } from '@kbn/agent-builder-common';
import { ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import { createLoggerService } from '../../../lib/services/logger_service/logger_service.mock';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';
import { findActionPoliciesTool } from './find_action_policies';

const policy = {
  id: 'policy-1',
  name: 'Page on-call',
  description: 'Pages the on-call team',
  enabled: true,
  destinations: [
    { type: 'workflow', id: 'wf-1' },
    { type: 'workflow', id: 'wf-2' },
  ],
  matcher: { tags: ['prod'], expression: 'data.severity : "critical"' },
  grouping: { mode: 'per_field', fields: ['host.name'] },
  created_by: null,
  created_at: '2026-04-01T00:00:00.000Z',
  updated_by: null,
  updated_at: '2026-04-10T00:00:00.000Z',
};

describe('findActionPoliciesTool', () => {
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
  let findActionPolicies: jest.Mock;
  let canRead: jest.Mock;

  const createTool = (canReadResult: boolean = true) => {
    canRead = jest.fn().mockResolvedValue(canReadResult);
    return findActionPoliciesTool({
      logger: loggerService,
      getActionPolicyClient: () => ({ findActionPolicies }),
      getPrivilegeChecker: () =>
        ({ canRead, canWrite: jest.fn().mockResolvedValue(true) } as unknown as PrivilegeChecker),
    });
  };

  type HandlerResult = Awaited<ReturnType<ReturnType<typeof createTool>['handler']>>;
  const firstResult = (result: HandlerResult) =>
    'results' in result ? result.results[0] : undefined;

  const run = (
    params: { search?: string; page?: number; perPage?: number } = {},
    tool = createTool()
  ) => tool.handler(params, agentBuilderMocks.tools.createHandlerContext());

  beforeEach(() => {
    ({ loggerService, mockLogger } = createLoggerService());
    findActionPolicies = jest
      .fn()
      .mockResolvedValue({ items: [policy], total: 1, page: 1, perPage: 20 });
  });

  describe('definition', () => {
    it('is a builtin tool with the find action policies id', () => {
      const tool = createTool();

      expect(tool.id).toBe(ALERTING_TOOL_IDS.findActionPolicies);
      expect(tool.type).toBe(ToolType.builtin);
      expect(tool.description).toContain('read-only');
      expect(tool.description).toContain('action-policy-authoring');
    });

    it('bounds the search text and page size', () => {
      const { schema } = createTool();

      expect(schema.safeParse({}).success).toBe(true);
      expect(schema.safeParse({ search: 'a'.repeat(513) }).success).toBe(false);
      expect(schema.safeParse({ perPage: 51 }).success).toBe(false);
      expect(schema.safeParse({ page: 0 }).success).toBe(false);
    });
  });

  describe('handler', () => {
    it('returns a compact summary of the matching policies', async () => {
      const result = await run({ search: 'on-call' });

      expect(findActionPolicies).toHaveBeenCalledWith({
        search: 'on-call',
        page: undefined,
        perPage: 20,
        sortField: 'name',
      });
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: {
              total: 1,
              page: 1,
              perPage: 20,
              items: [
                {
                  id: 'policy-1',
                  name: 'Page on-call',
                  description: 'Pages the on-call team',
                  enabled: true,
                  matcher: 'tags: prod AND expression: "data.severity : "critical""',
                  groupingMode: 'per_field',
                  destinationCount: 2,
                },
              ],
            },
          },
        ],
      });
    });

    it('lists all policies when no search is given and forwards paging', async () => {
      await run({ page: 2, perPage: 5 });

      expect(findActionPolicies).toHaveBeenCalledWith({
        page: 2,
        perPage: 5,
        sortField: 'name',
      });
    });

    it('omits missing description and shows an empty matcher', async () => {
      findActionPolicies.mockResolvedValueOnce({
        items: [{ ...policy, description: undefined, matcher: undefined, grouping: undefined }],
        total: 1,
        page: 1,
        perPage: 20,
      });

      const result = await run();

      expect(firstResult(result)).toEqual({
        type: ToolResultType.other,
        data: expect.objectContaining({
          items: [
            {
              id: 'policy-1',
              name: 'Page on-call',
              enabled: true,
              matcher: '{}',
              groupingMode: undefined,
              destinationCount: 2,
            },
          ],
        }),
      });
    });

    it('returns an unauthorized result without querying when the user cannot read action policies', async () => {
      const result = await run({}, createTool(false));

      expect(canRead).toHaveBeenCalledWith('actionPolicies');
      expect(findActionPolicies).not.toHaveBeenCalled();
      expect(firstResult(result)).toEqual(
        expect.objectContaining({
          type: ToolResultType.error,
          data: expect.objectContaining({
            message: expect.stringContaining('Unauthorized to find action policies'),
          }),
        })
      );
    });

    it('logs and returns an error result when the lookup fails', async () => {
      findActionPolicies.mockRejectedValueOnce(new Error('boom'));

      const result = await run();

      expect(firstResult(result)).toEqual({
        type: ToolResultType.error,
        data: { message: 'Failed to find action policies: boom' },
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to find action policies',
        expect.objectContaining({
          labels: {
            space_id: 'default',
            code: ALERTING_LOG_CODES.AGENT_BUILDER_FIND_ACTION_POLICIES_FAILED,
          },
          error: expect.objectContaining({ message: 'boom', type: 'Error' }),
        })
      );
    });
  });
});
