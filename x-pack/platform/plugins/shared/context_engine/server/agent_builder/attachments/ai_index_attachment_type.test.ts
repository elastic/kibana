/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/server';
import type { AiIndexHttpItem } from '../../../common/http_api/ai_indices';
import { MAX_AI_INDEX_AUTOMATIONS } from '../../../common/constants';
import type { WorkflowsManagementApiLike } from '../../types';
import { createAiIndexAttachmentType } from './ai_index_attachment_type';

const deps = {
  getWorkflowsApi: () => undefined as WorkflowsManagementApiLike | undefined,
  getCapabilities: async () => ({} as Capabilities),
};

const aiIndex: AiIndexHttpItem = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ds' },
  automations: [{ type: 'workflow', value: 'wf-1' }],
  sources: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

describe('createAiIndexAttachmentType', () => {
  const type = createAiIndexAttachmentType(deps);

  it('is read-only and grants NO registered tools (getTools → []) so it can never widen an agent’s tool surface', async () => {
    expect(type.isReadonly).toBe(true);
    expect(await type.getTools?.()).toEqual([]);
  });

  it('exposes only the single read-only bounded tool via the formatted attachment', async () => {
    const formatted = await type.format(
      { id: `${type.id}.${aiIndex.id}`, type: type.id, data: aiIndex },
      {} as Parameters<typeof type.format>[1]
    );
    const boundedTools = (await formatted.getBoundedTools?.()) ?? [];
    expect(boundedTools).toHaveLength(1);
    expect(boundedTools[0].id).toContain('get_ai_index_automations');
  });

  it('validates a well-formed payload and rejects an over-long automations array', async () => {
    expect((await type.validate(aiIndex)).valid).toBe(true);

    const tooManyAutomations = {
      ...aiIndex,
      automations: Array.from({ length: MAX_AI_INDEX_AUTOMATIONS + 1 }, (_, i) => ({
        type: 'workflow' as const,
        value: `wf-${i}`,
      })),
    };
    expect((await type.validate(tooManyAutomations)).valid).toBe(false);
  });
});
