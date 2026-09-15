/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { runTask } from './task';
import { PLAN_MERGE_SYSTEM_PROMPT, REINFORCEMENT_GUIDANCE } from './prompt';

const plan = {
  monitor_id: '',
  applicability: '',
  category_identification: '',
  decision_tree_mermaid: 'flowchart TD\nS1 -->|✅ yes| X1',
  keywords: [],
};

it('assembles reinforcement-only content, resetting marks with the Python regex', async () => {
  const output = jest.fn().mockResolvedValue({ output: plan });
  const input = {
    initial_tree_mermaid: 'S1 -->|✅   yes| E1\nE1 -->|"✅ quoted"| X1',
    causal_summary: 'Synthetic cause',
    question: 'MUST NOT BE SENT',
  };
  expect(await runTask({ output }, input)).toEqual({ merged_mermaid: plan.decision_tree_mermaid });
  expect(output).toHaveBeenCalledTimes(1);
  expect(output).toHaveBeenCalledWith(
    expect.objectContaining({
      system: PLAN_MERGE_SYSTEM_PROMPT,
      abortSignal: expect.any(AbortSignal),
    })
  );
  const prompt = output.mock.calls[0][0].input;
  expect(prompt).toContain('S1 -->|yes| E1\nE1 -->|"✅ quoted"| X1');
  expect(prompt).toContain('**Evidence Gatherer Metadata:**\n(none)');
  expect(prompt).toContain(
    '## Causal Analysis (confirmed root cause from human feedback)\n\nSynthetic cause'
  );
  expect(prompt).toContain(REINFORCEMENT_GUIDANCE);
  expect(prompt).not.toContain(input.question);
});

it('records inference exceptions as empty merged trees', async () => {
  expect(
    await runTask({ output: jest.fn().mockRejectedValue(new Error('unavailable')) }, {})
  ).toEqual({ merged_mermaid: '', error: 'unavailable' });
});

it('matches the complete request text assembled by the pinned Python reference', async () => {
  const output = jest.fn().mockResolvedValue({ output: {} });
  await runTask(
    { output },
    { initial_tree_mermaid: 'S1 -->|✅ yes| X1', causal_summary: 'Synthetic cause' }
  );
  const request = output.mock.calls[0][0];
  // SHA-256 of Python's system + newline + human text for this synthetic input at a60f802.
  expect(
    createHash('sha256')
      .update(request.system + '\n' + request.input)
      .digest('hex')
  ).toBe('19121fd29c4c33502d51716a1887d1a68c4f7d43149a03828262a1998d790040');
});
