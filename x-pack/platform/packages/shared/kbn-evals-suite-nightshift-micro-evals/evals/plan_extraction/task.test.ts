/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { runTask } from './task';
import { PLAN_EXTRACTION_SYSTEM_PROMPT } from './prompt';

const plan = {
  monitor_id: 'synthetic',
  applicability: 'Synthetic alerts',
  category_identification: 'Latency',
  decision_tree_mermaid: 'flowchart TD',
  keywords: ['latency'],
  evidence_gatherer_metadata: ['E1: inspect synthetic metrics'],
};

describe('plan extraction reference target', () => {
  it('maps conversation roles and appends the non-preserving base-tree instructions', async () => {
    const output = jest.fn().mockResolvedValue({ output: plan });
    expect(
      await runTask(
        { output },
        {
          messages: [
            { type: 'AI', content: 'found logs' },
            { type: 'assistant', content: 'checked traces' },
            { content: 'please investigate' },
            { type: 'system', content: 'context' },
          ],
          existing_tree_mermaid: 'flowchart TD\nS1([Synthetic alert])',
        }
      )
    ).toEqual(plan);
    expect(output).toHaveBeenCalledTimes(1);
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({
        system: PLAN_EXTRACTION_SYSTEM_PROMPT,
        previousMessages: [
          { role: 'assistant', content: 'found logs' },
          { role: 'assistant', content: 'checked traces' },
          { role: 'user', content: 'please investigate' },
          { role: 'user', content: 'context' },
        ],
        input: expect.stringContaining('Re-mark ✅: add ✅ to edges taken in THIS investigation'),
        abortSignal: expect.any(AbortSignal),
      })
    );
    expect(output.mock.calls[0][0].input).toContain('flowchart TD\nS1([Synthetic alert])');
    expect(output.mock.calls[0][0].input).not.toContain('Preserve ALL existing ✅');
  });
  it('omits the evolution section when no base tree exists', async () => {
    const output = jest.fn().mockResolvedValue({ output: plan });
    await runTask({ output }, {});
    expect(output.mock.calls[0][0].input).not.toContain('Existing tree to evolve');
    expect(output.mock.calls[0][0].input).toContain('**Decision** `{{...}}`');
    expect(output.mock.calls[0][0].previousMessages).toEqual([]);
  });
  it('uses the Pydantic default for evidence metadata', async () => {
    const { evidence_gatherer_metadata, ...partial } = plan;
    const output = jest.fn().mockResolvedValue({ output: partial });
    expect(await runTask({ output }, {})).toEqual({ ...partial, evidence_gatherer_metadata: [] });
    expect(output.mock.calls[0][0].schema.required).toEqual([
      'monitor_id',
      'applicability',
      'category_identification',
      'decision_tree_mermaid',
      'keywords',
    ]);
  });
  it('records inference exceptions as empty trees', async () => {
    expect(
      await runTask({ output: jest.fn().mockRejectedValue(new Error('unavailable')) }, {})
    ).toEqual({ decision_tree_mermaid: '', error: 'unavailable' });
  });
});

it('matches the complete request text assembled by the pinned Python reference', async () => {
  const output = jest.fn().mockResolvedValue({ output: {} });
  await runTask({ output }, {});
  const request = output.mock.calls[0][0];
  // SHA-256 of Python's system + newline + human text for this synthetic input at a60f802.
  expect(
    createHash('sha256')
      .update(request.system + '\n' + request.input)
      .digest('hex')
  ).toBe('72ae871b66126c5e4ee908598cf726e90fcc591dea22e794a3b0f57fdd30a928');
});
