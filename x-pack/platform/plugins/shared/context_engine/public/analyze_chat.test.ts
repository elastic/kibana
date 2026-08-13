/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { AiIndexHttpItem } from '../common/http_api/ai_indices';
import { createBuildAnalyzeChat, fetchWorkflowYaml } from './analyze_chat';

const aiIndex = (overrides: Partial<AiIndexHttpItem> = {}): AiIndexHttpItem => ({
  id: 'my-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ds-my-index' },
  sources: [{ type: 'esql', value: 'FROM logs' }],
  automations: [
    { type: 'workflow', value: 'wf-1' },
    { type: 'workflow', value: 'wf-2' },
  ],
  feedback_agent_id: 'agent-1',
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const httpMock = (get: jest.Mock): HttpStart => ({ get } as unknown as HttpStart);

describe('fetchWorkflowYaml', () => {
  it('reads the workflow via the RBAC-enforced public route with the API version', async () => {
    const get = jest.fn().mockResolvedValue({ id: 'wf-1', name: 'WF One', yaml: 'name: wf-1' });
    const result = await fetchWorkflowYaml(httpMock(get), 'wf-1');

    expect(get).toHaveBeenCalledWith('/api/workflows/workflow/wf-1', { version: '2023-10-31' });
    expect(result).toEqual({ workflowId: 'wf-1', name: 'WF One', yaml: 'name: wf-1' });
  });

  it('url-encodes the workflow id', async () => {
    const get = jest.fn().mockResolvedValue({ id: 'a/b', yaml: 'x' });
    await fetchWorkflowYaml(httpMock(get), 'a/b');
    expect(get).toHaveBeenCalledWith('/api/workflows/workflow/a%2Fb', { version: '2023-10-31' });
  });

  it('returns undefined when the read fails (e.g. 403/404)', async () => {
    const get = jest.fn().mockRejectedValue(new Error('Forbidden'));
    expect(await fetchWorkflowYaml(httpMock(get), 'wf-1')).toBeUndefined();
  });

  it('returns undefined when the workflow has no yaml', async () => {
    const get = jest.fn().mockResolvedValue({ id: 'wf-1' });
    expect(await fetchWorkflowYaml(httpMock(get), 'wf-1')).toBeUndefined();
  });
});

describe('createBuildAnalyzeChat', () => {
  it('builds a text summary + one workflow.yaml attachment (by value) per readable workflow', async () => {
    const get = jest
      .fn()
      .mockResolvedValueOnce({ id: 'wf-1', name: 'WF One', yaml: 'name: wf-1' })
      .mockResolvedValueOnce({ id: 'wf-2', name: 'WF Two', yaml: 'name: wf-2' });

    const options = await createBuildAnalyzeChat(httpMock(get))({ aiIndex: aiIndex() });

    expect(options.agentId).toBe('agent-1');
    expect(options.newConversation).toBe(true);
    expect(options.sessionTag).toBe('context-engine-feedback:my-index');

    const [text, ...workflows] = options.attachments;
    expect(text).toEqual({
      id: 'context-engine-ai-index:my-index',
      type: 'text',
      data: { content: expect.stringContaining('AI index: my-index') },
    });
    expect(workflows).toEqual([
      {
        id: 'workflow:wf-1',
        type: 'workflow.yaml',
        data: { yaml: 'name: wf-1', workflowId: 'wf-1', name: 'WF One' },
      },
      {
        id: 'workflow:wf-2',
        type: 'workflow.yaml',
        data: { yaml: 'name: wf-2', workflowId: 'wf-2', name: 'WF Two' },
      },
    ]);
  });

  it('skips workflows the user cannot read and notes the omission in the summary', async () => {
    const get = jest
      .fn()
      .mockResolvedValueOnce({ id: 'wf-1', yaml: 'name: wf-1' })
      .mockRejectedValueOnce(new Error('Forbidden'));

    const options = await createBuildAnalyzeChat(httpMock(get))({ aiIndex: aiIndex() });

    const workflowAttachments = options.attachments.filter((a) => a.type === 'workflow.yaml');
    expect(workflowAttachments).toHaveLength(1);
    expect(workflowAttachments[0].id).toBe('workflow:wf-1');

    const text = options.attachments[0];
    expect((text.data as { content: string }).content).toContain(
      '1 linked workflow(s) you cannot access were omitted'
    );
  });

  it('attaches only the text summary when there are no automations', async () => {
    const get = jest.fn();
    const options = await createBuildAnalyzeChat(httpMock(get))({
      aiIndex: aiIndex({ automations: [] }),
    });

    expect(get).not.toHaveBeenCalled();
    expect(options.attachments).toHaveLength(1);
    expect(options.attachments[0].type).toBe('text');
  });

  it('passes through an undefined feedback agent (button gating handles the no-agent case)', async () => {
    const get = jest.fn();
    const options = await createBuildAnalyzeChat(httpMock(get))({
      aiIndex: aiIndex({ automations: [], feedback_agent_id: undefined }),
    });
    expect(options.agentId).toBeUndefined();
  });
});
