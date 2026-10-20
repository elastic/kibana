/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
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
