/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { AiIndexBudgetStatusResponse } from '@kbn/context-engine-plugin/common/budgets';
import type { BudgetServiceApi } from '@kbn/context-engine-plugin/server';
import {
  AI_INDEX_AUTOMATIONS_SKILL_ID,
  AI_INDEX_SOURCES_SKILL_ID,
  ANALYZE_AND_IMPROVE_SKILL_ID,
  CONTEXT_ENGINE_SIGNALS_SKILL_ID,
  KI_RETRIEVAL_SKILL_ID,
} from '../../common/agent_builder_skills';
import {
  CONTEXT_ENGINE_INSTALL_AUTOMATION_TEMPLATE_TOOL_ID,
  CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID,
} from '../../common/agent_builder_tools';
import { createAiIndexAttachmentType } from './ai_index';

describe('createAiIndexAttachmentType', () => {
  const attachmentType = createAiIndexAttachmentType();
  const formatContext = {
    request: httpServerMock.createKibanaRequest(),
    spaceId: 'default',
  };

  const validData = {
    id: 'my-ai-index',
    description: 'Support tickets',
    memory_enabled: false,
    dest: { type: 'data_stream' as const, value: 'ai-index-ds-my-ai-index' },
    sources: [{ type: 'esql' as const, value: 'FROM tickets' }],
    automations: [{ type: 'workflow' as const, value: 'wf-1' }],
    traces: [],
  };

  it('registers the expected attachment type id', () => {
    expect(attachmentType.id).toBe('platform.context_engine.ai_index');
    expect(attachmentType.isReadonly).toBe(true);
    expect(attachmentType.getTools?.()).toEqual([
      CONTEXT_ENGINE_INSTALL_AUTOMATION_TEMPLATE_TOOL_ID,
      CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID,
    ]);
  });

  it('validates attachment data', async () => {
    const result = await attachmentType.validate(validData);
    expect(result).toEqual({ valid: true, data: validData });
  });

  it('rejects invalid attachment data', async () => {
    const result = await attachmentType.validate({ id: 'only-id' });
    expect(result.valid).toBe(false);
  });

  it('describes the index snapshot and the authority to write to it', () => {
    const description = attachmentType.getAgentDescription?.();

    expect(description).toMatch(/read-only snapshot of a Context Engine AI index/);
    expect(description).toMatch(/scope the conversation to this index/);
    expect(description).toMatch(/authorizes you to apply changes to this index/);
    expect(description).toContain(CONTEXT_ENGINE_INSTALL_AUTOMATION_TEMPLATE_TOOL_ID);
    expect(description).toContain(CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID);
  });

  it('leaves how the conversation goes to the Context Engine agent instructions', () => {
    const description = attachmentType.getAgentDescription?.() ?? '';

    // Which skill to load, when to ask and how saving and running work moved to the agent's
    // instructions, where they are part of the system prompt.
    for (const skillId of [
      ANALYZE_AND_IMPROVE_SKILL_ID,
      AI_INDEX_AUTOMATIONS_SKILL_ID,
      AI_INDEX_SOURCES_SKILL_ID,
      KI_RETRIEVAL_SKILL_ID,
      CONTEXT_ENGINE_SIGNALS_SKILL_ID,
    ]) {
      expect(description).not.toContain(skillId);
    }
    expect(description).not.toMatch(/Ask before you build/);
    expect(description).not.toContain('ask_user_question');
    expect(description).not.toMatch(/subagent/);
    expect(description).not.toMatch(/run\.started|`run` set to true/);
  });

  it('formats the attachment for the agent', async () => {
    const formatted = await attachmentType.format(
      {
        id: 'attachment-1',
        type: attachmentType.id,
        data: validData,
      },
      formatContext
    );
    const representation = await formatted.getRepresentation?.();

    expect(representation).toEqual({
      type: 'text',
      value: expect.stringContaining('AI index: my-ai-index'),
    });
    if (representation?.type !== 'text') {
      throw new Error('expected a text representation');
    }
    expect(representation.value).toContain('Destination: data_stream "ai-index-ds-my-ai-index"');
    expect(representation.value).toContain('Sources: esql:FROM tickets');
    expect(representation.value).toContain('Existing automations (workflow ids): wf-1');
    expect(representation.value).toContain('Traces: none configured');
  });

  describe('budget', () => {
    const bucket = (costUsd: number, limitUsd?: number) => ({
      ...(limitUsd !== undefined && { limit_usd: limitUsd }),
      spend: {
        cost_usd: costUsd,
        unpriced_tokens: 0,
        tokens: { input_tokens: 0, output_tokens: 0, cached_tokens: 0 },
      },
      state: 'ok' as const,
    });
    const status: AiIndexBudgetStatusResponse = {
      ai_index_id: 'my-ai-index',
      period: { start: '2026-10-01T00:00:00.000Z', end: '2026-11-01T00:00:00.000Z' },
      pricing: { source: 'elastic_price_catalog' },
      config: { automations_monthly_usd: 50, cost_tier: 'cheap' },
      cost_tier: 'cheap',
      ai_index: { automations: bucket(12.3, 50), suggestions: bucket(1) },
      space: { automations: bucket(70, 100), suggestions: bucket(4, 20) },
    };

    const formatWith = async (getBudgetService: () => Promise<BudgetServiceApi>) => {
      const formatted = await createAiIndexAttachmentType({
        getBudgetService,
        logger: loggingSystemMock.createLogger(),
      }).format({ id: 'attachment-1', type: attachmentType.id, data: validData }, formatContext);
      const representation = await formatted.getRepresentation?.();
      if (representation?.type !== 'text') {
        throw new Error('expected a text representation');
      }
      return representation.value;
    };

    it('adds the cost tier and the tighter of the index and space remainders', async () => {
      const getAiIndexStatus = jest.fn().mockResolvedValue(status);
      const value = await formatWith(async () => ({
        getAiIndexStatus,
        getSpaceStatus: jest.fn(),
        checkAdmission: jest.fn(),
        setAiIndexBudget: jest.fn(),
      }));

      expect(getAiIndexStatus).toHaveBeenCalledWith('default', 'my-ai-index');
      expect(value).toContain('Cost tier: cheap');
      expect(value).toContain('reset 2026-11-01');
      expect(value).toContain('- Automation runs: $30.00 left this month');
      expect(value).toContain('- Automation suggestions: $16.00 left this month');
    });

    it('keeps the snapshot when the budget cannot be read', async () => {
      const value = await formatWith(async () => {
        throw new Error('boom');
      });

      expect(value).toContain('AI index: my-ai-index');
      expect(value).not.toContain('Cost tier');
    });
  });

  it('validates attachment data with traces including derived query', async () => {
    const traces = [
      {
        type: 'elastic_agent' as const,
        value: 'support-agent',
        query:
          'FROM traces-agent_builder.otel-default | WHERE attributes.gen_ai.agent.id IN ("support-agent")',
      },
    ];
    const result = await attachmentType.validate({ ...validData, traces });
    expect(result).toEqual({ valid: true, data: { ...validData, traces } });
  });

  it('formats traces as type:value -> query when configured', async () => {
    const formatted = await attachmentType.format(
      {
        id: 'attachment-1',
        type: attachmentType.id,
        data: {
          ...validData,
          traces: [
            {
              type: 'elastic_agent' as const,
              value: 'support-agent',
              query:
                'FROM traces-agent_builder.otel-default\n| WHERE attributes.gen_ai.agent.id IN ("support-agent")',
            },
            { type: 'index' as const, value: 'logs-*', query: 'FROM logs-*' },
          ],
        },
      },
      formatContext
    );
    const representation = await formatted.getRepresentation?.();

    if (representation?.type !== 'text') {
      throw new Error('expected a text representation');
    }
    expect(representation.value).toContain(
      '- elastic_agent:support-agent -> FROM traces-agent_builder.otel-default | WHERE attributes.gen_ai.agent.id IN ("support-agent")'
    );
    expect(representation.value).toContain('- index:logs-* -> FROM logs-*');
  });

  it('formats an esql trace as its query alone, without repeating the value', async () => {
    const formatted = await attachmentType.format(
      {
        id: 'attachment-1',
        type: attachmentType.id,
        data: {
          ...validData,
          traces: [
            {
              type: 'esql' as const,
              value: 'FROM traces-* | LIMIT 10',
              query: 'FROM traces-* | LIMIT 10',
            },
          ],
        },
      },
      formatContext
    );
    const representation = await formatted.getRepresentation?.();

    if (representation?.type !== 'text') {
      throw new Error('expected a text representation');
    }
    expect(representation.value).toContain('- esql: FROM traces-* | LIMIT 10');
    expect(representation.value).not.toContain('esql:FROM traces-* | LIMIT 10 ->');
  });
});
