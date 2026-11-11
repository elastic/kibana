/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ToolHandlerContextMock } from '@kbn/agent-builder-plugin/server/mocks';
import { ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import { ACTION_POLICY_ATTACHMENT_TYPE, RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import { linkRuleAndActionPolicyTool } from './link_rule_and_action_policy';

const RULE_ID = '3f2a9c1b-7d4e-4a55-9c0e-1b2c3d4e5f60';
const TAG = 'high-cpu-b4a605da';

const ruleData = (metadataExtra: Record<string, unknown> = {}) => ({
  id: RULE_ID,
  kind: 'alert',
  metadata: { name: 'High CPU', ...metadataExtra },
});

interface Records {
  rule?: Record<string, unknown>;
  policy?: { data: Record<string, unknown>; origin?: string };
}

const createContext = ({
  rule = ruleData(),
  policy = { data: { name: 'Notify' } },
}: Records = {}): ToolHandlerContextMock => {
  const ctx = agentBuilderMocks.tools.createHandlerContext();
  ctx.attachments.getAttachmentRecord.mockImplementation(((id: string) => {
    if (id === 'rule-att') {
      return { type: RULE_ATTACHMENT_TYPE, versions: [{ data: rule }] };
    }
    if (id === 'policy-att') {
      return {
        type: ACTION_POLICY_ATTACHMENT_TYPE,
        versions: [{ data: policy.data }],
        ...(policy.origin ? { origin: policy.origin } : {}),
      };
    }
    return undefined;
  }) as never);
  ctx.attachments.update.mockImplementation((async (id: string) => ({
    id,
    current_version: id === 'rule-att' ? 2 : 3,
  })) as never);
  return ctx;
};

const createLogger = (): jest.Mocked<
  Pick<LoggerServiceContract, 'debug' | 'info' | 'warn' | 'error' | 'forSubsystem'>
> => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  forSubsystem: jest.fn(),
});

type UpdateCall = [
  attachmentId: string,
  input: { data: { metadata?: { routing_tags?: string[] }; matcher?: { tags?: string[] } } }
];

const input = { ruleAttachmentId: 'rule-att', policyAttachmentId: 'policy-att' };

describe('linkRuleAndActionPolicyTool', () => {
  let logger: ReturnType<typeof createLogger>;
  let tool: ReturnType<typeof linkRuleAndActionPolicyTool>;

  const run = async (args: typeof input, ctx: ToolHandlerContextMock): Promise<ToolResult[]> => {
    const result = await tool.handler(args, ctx);
    return (result as { results: ToolResult[] }).results;
  };

  beforeEach(() => {
    logger = createLogger();
    tool = linkRuleAndActionPolicyTool({ logger: logger as unknown as LoggerServiceContract });
  });

  it('exposes the stable tool id and tells the model not to set the tags by hand', () => {
    expect(tool.id).toBe(ALERTING_TOOL_IDS.linkRuleAndActionPolicy);
    expect(tool.description).toContain('Do NOT set these tags by hand');
  });

  it('writes the same generated tag on the rule and the policy', async () => {
    const ctx = createContext();

    const results = await run(input, ctx);

    expect(ctx.attachments.update).toHaveBeenCalledTimes(2);
    const [[ruleId, ruleUpdate], [policyId, policyUpdate]] = ctx.attachments.update.mock
      .calls as unknown as [UpdateCall, UpdateCall];
    expect(ruleId).toBe('rule-att');
    expect(ruleUpdate.data.metadata?.routing_tags).toEqual([TAG]);
    expect(policyId).toBe('policy-att');
    expect(policyUpdate.data.matcher?.tags).toEqual([TAG]);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: ToolResultType.other,
      data: {
        tag: TAG,
        alreadyLinked: false,
        ruleAttachment: { id: 'rule-att', name: 'High CPU', version: 2 },
        actionPolicyAttachment: { id: 'policy-att', name: 'Notify', version: 3 },
      },
    });
    expect((results[0] as { data: object }).data).not.toHaveProperty('warnings');
  });

  it('saves nothing when the rule and the policy already share a tag', async () => {
    const ctx = createContext({
      rule: ruleData({ routing_tags: ['shared'] }),
      policy: { data: { name: 'Notify', matcher: { tags: ['shared'] } } },
    });

    const results = await run(input, ctx);

    expect(ctx.attachments.update).not.toHaveBeenCalled();
    expect(results[0]).toMatchObject({
      type: ToolResultType.other,
      data: { tag: 'shared', alreadyLinked: true },
    });
  });

  it('returns the narrowing warning for a saved catch-all policy', async () => {
    const ctx = createContext({ policy: { data: { name: 'Notify' }, origin: 'policy-1' } });

    const results = await run(input, ctx);

    expect(results[0]).toMatchObject({
      type: ToolResultType.other,
      data: {
        tag: TAG,
        warnings: [expect.stringContaining('other rules will stop notifying')],
      },
    });
  });

  it('returns an error result without warning-level logs when the input is invalid', async () => {
    const ctx = createContext();

    const results = await run({ ...input, ruleAttachmentId: 'missing' }, ctx);

    expect(ctx.attachments.update).not.toHaveBeenCalled();
    expect(results[0]).toMatchObject({
      type: ToolResultType.error,
      data: {
        message: expect.stringContaining('Rule attachment "missing" was not found'),
        metadata: { ruleAttachmentId: 'missing', policyAttachmentId: 'policy-att' },
      },
    });
    expect(logger.debug).toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('restores the rule attachment when the policy update fails', async () => {
    const ctx = createContext();
    ctx.attachments.update.mockImplementation((async (id: string) => {
      if (id === 'policy-att') {
        throw new Error('policy boom');
      }
      return { id, current_version: 2 };
    }) as never);

    const results = await run(input, ctx);

    expect(ctx.attachments.update).toHaveBeenCalledTimes(3);
    const restoreCall = ctx.attachments.update.mock.calls[2] as unknown as UpdateCall;
    expect(restoreCall[0]).toBe('rule-att');
    expect(restoreCall[1].data.metadata?.routing_tags).toBeUndefined();
    expect(results[0]).toMatchObject({
      type: ToolResultType.error,
      data: { message: expect.stringContaining('policy boom') },
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ALERTING_LOG_CODES.AGENT_BUILDER_LINK_RULE_AND_ACTION_POLICY_FAILED,
      })
    );
  });

  it('logs a dedicated code when the rule attachment cannot be restored', async () => {
    const ctx = createContext();
    let ruleSaves = 0;
    ctx.attachments.update.mockImplementation((async (id: string) => {
      if (id === 'policy-att') {
        throw new Error('policy boom');
      }
      ruleSaves += 1;
      if (ruleSaves > 1) {
        throw new Error('rollback boom');
      }
      return { id, current_version: 2 };
    }) as never);

    const results = await run(input, ctx);

    expect(results[0]).toMatchObject({
      type: ToolResultType.error,
      data: { message: expect.stringContaining('rollback boom') },
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ code: ALERTING_LOG_CODES.AGENT_BUILDER_LINK_ROLLBACK_FAILED })
    );
  });
});
