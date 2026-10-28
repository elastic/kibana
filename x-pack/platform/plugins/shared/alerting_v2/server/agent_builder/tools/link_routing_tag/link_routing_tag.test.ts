/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ToolHandlerContextMock } from '@kbn/agent-builder-plugin/server/mocks';
import { MAX_TAGS } from '@kbn/alerting-v2-constants';
import {
  ACTION_POLICY_ATTACHMENT_TYPE,
  POLICY_MATCHER_TAGS_MAX,
  RULE_ATTACHMENT_TYPE,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import { linkActionPolicyToRuleTool } from './link_action_policy_to_rule';
import { linkRuleToActionPolicyTool } from './link_rule_to_action_policy';
import { linkRoutingTag, type LinkRoutingTagResult } from './link_routing_tag';

const createLogger = (): jest.Mocked<
  Pick<LoggerServiceContract, 'debug' | 'info' | 'warn' | 'error' | 'forSubsystem'>
> => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  forSubsystem: jest.fn(),
});

const attachment = ({
  id,
  type,
  data,
  origin,
  version = 1,
}: {
  id: string;
  type: string;
  data: Record<string, unknown>;
  origin?: string;
  version?: number;
}) => ({
  id,
  type,
  origin,
  current_version: version,
  versions: [
    {
      version,
      data,
      created_at: '2026-01-01T00:00:00.000Z',
      content_hash: 'hash',
    },
  ],
});

const ruleData = {
  id: 'rule-origin',
  kind: 'alert',
  metadata: { name: 'High CPU Prod', tags: ['prod'], routing_tags: ['sre'] },
};

const policyData = {
  id: 'policy-origin',
  name: 'Notify on High CPU',
  matcher: { tags: ['sre'], expression: 'severity: "critical"' },
};

const createContext = (
  records: Record<string, ReturnType<typeof attachment> | undefined> = {
    'rule-1': attachment({ id: 'rule-1', type: RULE_ATTACHMENT_TYPE, data: ruleData }),
    'policy-1': attachment({
      id: 'policy-1',
      type: ACTION_POLICY_ATTACHMENT_TYPE,
      data: policyData,
    }),
  }
): ToolHandlerContextMock => {
  const ctx = agentBuilderMocks.tools.createHandlerContext();
  ctx.attachments.getAttachmentRecord.mockImplementation((id: string) => records[id] as never);
  ctx.attachments.update.mockImplementation(async (id: string) => {
    return {
      id,
      current_version: id === 'rule-1' ? 3 : 4,
    } as never;
  });
  return ctx;
};

const link = (
  ctx: ToolHandlerContextMock,
  logger: ReturnType<typeof createLogger>,
  input: { ruleAttachmentId?: string; actionPolicyAttachmentId?: string; tag?: string } = {}
) =>
  linkRoutingTag(
    {
      ruleAttachmentId: 'rule-1',
      actionPolicyAttachmentId: 'policy-1',
      ...input,
    },
    {
      attachments: ctx.attachments,
      logger: logger as unknown as LoggerServiceContract,
      spaceId: ctx.spaceId,
    }
  );

const resultData = (result: Awaited<ReturnType<typeof link>>): LinkRoutingTagResult => {
  const first = result.results[0];
  if (first.type !== ToolResultType.other) {
    throw new Error(`expected a success result, received ${first.type}`);
  }
  return first.data as LinkRoutingTagResult;
};

const errorMessage = (result: Awaited<ReturnType<typeof link>>): string => {
  const first = result.results[0];
  if (first.type !== ToolResultType.error) {
    throw new Error(`expected an error result, received ${first.type}`);
  }
  return (first.data as { message: string }).message;
};

const updatedData = (
  ctx: ToolHandlerContextMock,
  id: string
): { metadata?: unknown; matcher?: unknown } | undefined => {
  const call = ctx.attachments.update.mock.calls.find((entry) => entry[0] === id);
  return call?.[1]?.data as { metadata?: unknown; matcher?: unknown } | undefined;
};

describe('linkRoutingTag', () => {
  let logger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    logger = createLogger();
  });

  it('unions a derived notify tag onto the rule and the policy and keeps the matcher expression', async () => {
    const ctx = createContext();

    const data = resultData(await link(ctx, logger));

    expect(data.routing_tag).toBe('notify-high-cpu-prod');
    expect(data.rule_saved).toBe(false);
    expect(data.matches_before_rule_saved).toBe(false);
    expect(data.ruleAttachment).toEqual({
      id: 'rule-1',
      version: 3,
      ruleId: 'rule-origin',
      routing_tags: ['sre', 'notify-high-cpu-prod'],
    });
    expect(data.actionPolicyAttachment).toEqual({
      id: 'policy-1',
      version: 4,
      policyId: 'policy-origin',
      matcher_tags: ['sre', 'notify-high-cpu-prod'],
    });
    expect(updatedData(ctx, 'rule-1')?.metadata).toEqual({
      name: 'High CPU Prod',
      tags: ['prod'],
      routing_tags: ['sre', 'notify-high-cpu-prod'],
    });
    expect(updatedData(ctx, 'policy-1')?.matcher).toEqual({
      tags: ['sre', 'notify-high-cpu-prod'],
      expression: 'severity: "critical"',
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('uses the provided tag and reports rule_saved when the rule has an origin', async () => {
    const ctx = createContext({
      'rule-1': attachment({
        id: 'rule-1',
        type: RULE_ATTACHMENT_TYPE,
        origin: 'saved-rule',
        version: 2,
        data: ruleData,
      }),
      'policy-1': attachment({
        id: 'policy-1',
        type: ACTION_POLICY_ATTACHMENT_TYPE,
        data: { name: 'Notify' },
      }),
    });

    const data = resultData(await link(ctx, logger, { tag: 'page-oncall' }));

    expect(data.routing_tag).toBe('page-oncall');
    expect(data.rule_saved).toBe(true);
    expect(data).not.toHaveProperty('matches_before_rule_saved');
    expect(data.ruleAttachment.routing_tags).toEqual(['sre', 'page-oncall']);
    expect(data.actionPolicyAttachment.matcher_tags).toEqual(['page-oncall']);
  });

  it('returns the current versions without saving when the tag is already on both sides', async () => {
    const ctx = createContext({
      'rule-1': attachment({
        id: 'rule-1',
        type: RULE_ATTACHMENT_TYPE,
        version: 5,
        data: {
          ...ruleData,
          metadata: { ...ruleData.metadata, routing_tags: ['sre', 'notify-high-cpu-prod'] },
        },
      }),
      'policy-1': attachment({
        id: 'policy-1',
        type: ACTION_POLICY_ATTACHMENT_TYPE,
        version: 6,
        data: {
          ...policyData,
          matcher: { tags: ['sre', 'notify-high-cpu-prod'], expression: 'severity: "critical"' },
        },
      }),
    });

    const data = resultData(await link(ctx, logger));

    expect(ctx.attachments.update).not.toHaveBeenCalled();
    expect(data.ruleAttachment.version).toBe(5);
    expect(data.actionPolicyAttachment.version).toBe(6);
    expect(data.routing_tag).toBe('notify-high-cpu-prod');
  });

  it('errors when an attachment id is missing', async () => {
    const ctx = createContext({
      'rule-1': attachment({ id: 'rule-1', type: RULE_ATTACHMENT_TYPE, data: ruleData }),
    });

    expect(errorMessage(await link(ctx, logger))).toBe(
      'Failed to link rule and action policy: Action policy attachment "policy-1" was not found.'
    );
    expect(ctx.attachments.update).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('errors when an attachment has the wrong type', async () => {
    const ctx = createContext({
      'rule-1': attachment({
        id: 'rule-1',
        type: 'workflow',
        data: { yaml: 'steps: []' },
      }),
      'policy-1': attachment({
        id: 'policy-1',
        type: ACTION_POLICY_ATTACHMENT_TYPE,
        data: policyData,
      }),
    });

    expect(errorMessage(await link(ctx, logger))).toContain('expected a rule');
    expect(ctx.attachments.update).not.toHaveBeenCalled();
  });

  it('errors for a signal rule', async () => {
    const ctx = createContext({
      'rule-1': attachment({
        id: 'rule-1',
        type: RULE_ATTACHMENT_TYPE,
        data: { ...ruleData, kind: 'signal' },
      }),
      'policy-1': attachment({
        id: 'policy-1',
        type: ACTION_POLICY_ATTACHMENT_TYPE,
        data: policyData,
      }),
    });

    expect(errorMessage(await link(ctx, logger))).toContain('alert rules');
    expect(ctx.attachments.update).not.toHaveBeenCalled();
  });

  it('errors when the rule has no usable name and no tag was passed', async () => {
    const ctx = createContext({
      'rule-1': attachment({
        id: 'rule-1',
        type: RULE_ATTACHMENT_TYPE,
        data: { kind: 'alert', metadata: { name: '!!!' } },
      }),
      'policy-1': attachment({
        id: 'policy-1',
        type: ACTION_POLICY_ATTACHMENT_TYPE,
        data: policyData,
      }),
    });

    expect(errorMessage(await link(ctx, logger))).toContain('The rule has no name');
    expect(ctx.attachments.update).not.toHaveBeenCalled();
  });

  it('errors at the routing-tag cap without dropping an existing tag', async () => {
    const routingTags = Array.from({ length: MAX_TAGS }, (_, index) => `route-${index}`);
    const ctx = createContext({
      'rule-1': attachment({
        id: 'rule-1',
        type: RULE_ATTACHMENT_TYPE,
        data: { ...ruleData, metadata: { ...ruleData.metadata, routing_tags: routingTags } },
      }),
      'policy-1': attachment({
        id: 'policy-1',
        type: ACTION_POLICY_ATTACHMENT_TYPE,
        data: policyData,
      }),
    });

    expect(errorMessage(await link(ctx, logger, { tag: 'one-more' }))).toContain(
      `already has ${MAX_TAGS} routing tags`
    );
    expect(ctx.attachments.update).not.toHaveBeenCalled();
  });

  it('errors at the matcher-tag cap without dropping an existing tag', async () => {
    const matcherTags = Array.from(
      { length: POLICY_MATCHER_TAGS_MAX },
      (_, index) => `match-${index}`
    );
    const ctx = createContext({
      'rule-1': attachment({ id: 'rule-1', type: RULE_ATTACHMENT_TYPE, data: ruleData }),
      'policy-1': attachment({
        id: 'policy-1',
        type: ACTION_POLICY_ATTACHMENT_TYPE,
        data: { ...policyData, matcher: { tags: matcherTags, expression: 'severity: "critical"' } },
      }),
    });

    expect(errorMessage(await link(ctx, logger, { tag: 'one-more' }))).toContain(
      `already has ${POLICY_MATCHER_TAGS_MAX} matcher tags`
    );
    expect(ctx.attachments.update).not.toHaveBeenCalled();
  });

  it('rolls the rule attachment back when the policy save fails', async () => {
    const ctx = createContext();
    ctx.attachments.update
      .mockResolvedValueOnce({ id: 'rule-1', current_version: 2 } as never)
      .mockRejectedValueOnce(new Error('policy save failed'))
      .mockResolvedValueOnce({ id: 'rule-1', current_version: 3 } as never);

    expect(errorMessage(await link(ctx, logger))).toContain('policy save failed');

    expect(ctx.attachments.update).toHaveBeenCalledTimes(3);
    const rollback = ctx.attachments.update.mock.calls[2];
    expect(rollback[0]).toBe('rule-1');
    expect(rollback[1].data).toEqual(ruleData);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ALERTING_LOG_CODES.AGENT_BUILDER_LINK_ROUTING_TAG_FAILED,
      })
    );
  });
});

describe('link routing tag tools', () => {
  const logger = createLogger();
  const deps = {
    logger: logger as unknown as LoggerServiceContract,
  };

  it('puts the rule first on the rule-authoring tool', () => {
    const tool = linkRuleToActionPolicyTool(deps);

    expect(tool.id).toBe('platform.alerting.link_rule_to_action_policy');
    expect(tool.excludeFromMcp).toBe(true);
    expect(tool.description).toContain("rule's metadata.routing_tags");
    expect(tool.description).not.toMatch(/tell the user|remind the user/i);
    expect(Object.keys(tool.schema.shape)).toEqual([
      'ruleAttachmentId',
      'actionPolicyAttachmentId',
      'tag',
    ]);
  });

  it('puts the action policy first on the action-policy-authoring tool', () => {
    const tool = linkActionPolicyToRuleTool(deps);

    expect(tool.id).toBe('platform.alerting.link_action_policy_to_rule');
    expect(tool.excludeFromMcp).toBe(true);
    expect(tool.description).toContain("policy's matcher.tags");
    expect(tool.description).not.toMatch(/tell the user|remind the user/i);
    expect(Object.keys(tool.schema.shape)).toEqual([
      'actionPolicyAttachmentId',
      'ruleAttachmentId',
      'tag',
    ]);
  });

  it('links through the action policy tool', async () => {
    const ctx = createContext();
    const tool = linkActionPolicyToRuleTool(deps);

    const result = await tool.handler(
      { actionPolicyAttachmentId: 'policy-1', ruleAttachmentId: 'rule-1' },
      ctx
    );

    expect(resultData(result as Awaited<ReturnType<typeof link>>).routing_tag).toBe(
      'notify-high-cpu-prod'
    );
  });
});
