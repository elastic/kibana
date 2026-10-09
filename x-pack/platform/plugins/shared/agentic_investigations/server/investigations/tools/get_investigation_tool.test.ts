/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { GET_INVESTIGATION_TOOL_ID } from '../../../common/investigations/constants';
import type { Investigation } from '../../../common/investigations/investigation';
import type { InvestigationsPrivilegesChecker } from '../services/check_investigations_privileges';
import { InvestigationsForbiddenError } from '../services/investigations_forbidden_error';
import type { InvestigationsQueryService } from '../services/investigations_query_service';
import { createGetInvestigationTool } from './get_investigation_tool';

const request = httpServerMock.createKibanaRequest();

const chart = {
  type: 'line' as const,
  title: 'Errors',
  x_axis: { type: 'time' as const },
  y_axis: {},
  series: [{ name: 'errors', points: [{ x: '2026-01-01T00:00:00Z', y: 3 }] }],
};

const investigation: Investigation = {
  id: 'conv-1',
  title: 'Checkout down',
  title_pending: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  agent_id: 'agent-1',
  metadata: { status: 'open', severity: 'high' },
  in_progress: false,
  subjects: [],
  impact: {
    evidence: { description: 'Errors rose', chart },
    entities: [{ id: 'checkout', evidence: { chart } }],
    created_at: '2026-01-01T00:00:00.000Z',
  },
  hypotheses: {
    hypotheses: [
      { candidate: 'Deploy', confidence: 0.9, status: 'confirmed', evidence: [{ chart }] },
    ],
    created_at: '2026-01-01T00:00:00.000Z',
  },
  proposals: [],
};

const contextFor = (conversationId?: string) =>
  ({
    request,
    runContext: {
      stack: conversationId ? [{ type: 'agent', agentId: 'agent-1', conversationId }] : [],
    },
  } as unknown as ToolHandlerContext);

const setup = (privileges: Partial<InvestigationsPrivilegesChecker> = {}) => {
  const get = jest.fn().mockResolvedValue(investigation);
  const tool = createGetInvestigationTool({
    getQueryService: () => ({ get } as unknown as InvestigationsQueryService),
    privileges: {
      assertCanRead: jest.fn().mockResolvedValue(undefined),
      assertCanManage: jest.fn(),
      ...privileges,
    },
    logger: loggerMock.create(),
  });
  const run = (params: { id?: string }, conversationId?: string) =>
    tool.handler(params, contextFor(conversationId)) as Promise<{
      results: Array<{ type: ToolResultType; data: Record<string, unknown> }>;
    }>;
  return { tool, get, run };
};

describe('agentic_investigations.get tool', () => {
  it('is a read-only builtin tool', () => {
    const { tool } = setup();
    expect(tool.id).toBe(GET_INVESTIGATION_TOOL_ID);
    expect(tool.annotations.readOnlyHint).toBe(true);
  });

  it('reads the current conversation when no id is given', async () => {
    const { get, run } = setup();

    const { results } = await run({}, 'conv-1');

    expect(get).toHaveBeenCalledWith(request, 'conv-1');
    expect(results[0].type).toBe(ToolResultType.other);
  });

  it('reads the given investigation, even outside a conversation', async () => {
    const { get, run } = setup();

    await run({ id: 'conv-2' });

    expect(get).toHaveBeenCalledWith(request, 'conv-2');
  });

  it('summarizes evidence charts instead of returning raw points', async () => {
    const { run } = setup();

    const { results } = await run({}, 'conv-1');
    const data = results[0].data as unknown as {
      impact: { evidence: string; entities: Array<{ evidence: string }> };
      hypotheses: { hypotheses: Array<{ evidence: string[] }> };
    };

    expect(data.impact.evidence).toContain('Errors rose');
    expect(data.impact.evidence).toContain('Chart "Errors"');
    expect(data.impact.entities[0].evidence).toContain('1 points');
    expect(data.hypotheses.hypotheses[0].evidence[0]).toContain('Chart "Errors"');
  });

  it('returns an error without an id outside a conversation', async () => {
    const { get, run } = setup();

    const { results } = await run({});

    expect(results[0].type).toBe(ToolResultType.error);
    expect(get).not.toHaveBeenCalled();
  });

  it('returns an error when the principal may not read investigations', async () => {
    const { get, run } = setup({
      assertCanRead: jest.fn().mockRejectedValue(new InvestigationsForbiddenError('nope')),
    });

    const { results } = await run({}, 'conv-1');

    expect(results[0].type).toBe(ToolResultType.error);
    expect(get).not.toHaveBeenCalled();
  });

  it('is unavailable to a principal that may not read investigations', async () => {
    const { tool } = setup({
      assertCanRead: jest.fn().mockRejectedValue(new InvestigationsForbiddenError('nope')),
    });

    await expect(
      tool.availability?.handler({ request, spaceId: 'default' } as never)
    ).resolves.toEqual({ status: 'unavailable', reason: 'nope' });
  });
});
