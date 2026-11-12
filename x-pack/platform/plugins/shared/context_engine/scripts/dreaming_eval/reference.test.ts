/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseConfig } from './config';
import {
  ALL_SAMPLES,
  indexPrompt,
  referenceDirOf,
  referenceFileOf,
  referencePrompt,
  renderTranscript,
  transcriptFileOf,
} from './reference';

const config = parseConfig(
  `
data_dir: /data
ai_indices:
  - id: eval-a
    description: What the assistant learned about its user.
    datasets: [longmemeval_s]
    dreaming:
      facts: [{ type: preference }]
`,
  '/repo/eval.yaml',
  '/repo'
);
const [aiIndex] = config.ai_indices;

describe('reference memories', () => {
  it('goes to the AI index folder of the data dir, a file per sample or one for all', () => {
    const dir = referenceDirOf(config, aiIndex);

    expect(dir).toBe('/data/references/eval-a');
    expect(referenceFileOf(dir, 'q1')).toBe('/data/references/eval-a/samples/q1.json');
    expect(referenceFileOf(dir, ALL_SAMPLES)).toBe('/data/references/eval-a/memories.json');
    expect(transcriptFileOf(dir, 'sharegpt/x:1')).toBe(
      '/data/references/eval-a/transcripts/sharegpt_x_1.md'
    );
  });

  it('writes a conversation as rounds with who said what, and when', () => {
    expect(
      renderTranscript({
        id: 'c1',
        title: 'Commute',
        rounds: [
          {
            startedAt: '2023-05-20T09:00:00.000Z',
            user: 'My commute is 45 minutes.',
            steps: [
              { thought: 'Look it up.', tool: 'search', arguments: '{"q":"x"}', result: 'none' },
            ],
            answer: 'Noted.',
          },
        ],
      })
    ).toBe(
      [
        '# Commute',
        '',
        'Conversation `c1`, 1 round.',
        '',
        '## Round 0 (2023-05-20T09:00:00.000Z)',
        '',
        'User: My commute is 45 minutes.',
        '',
        'Assistant (thinking): Look it up.',
        '',
        'Assistant called search: {"q":"x"}',
        '',
        'Tool result: none',
        '',
        'Assistant: Noted.',
        '',
      ].join('\n')
    );
  });

  it('prompts for the configured types only, with the transcripts, the output file and the prefix', () => {
    const prompt = referencePrompt({
      aiIndex,
      dreaming: {
        enabled: true,
        instructions: 'Record what the user says about themselves.',
        facts: [{ type: 'preference', description: 'What the user likes.' }],
        entities: {
          nodes: [{ type: 'person', description: 'Someone.', attributes: ['relation'] }],
        },
        relationships: [{ type: 'knows', description: 'A person knows a person.' }],
      },
      unit: 'q1',
      transcripts: ['/data/references/eval-a/transcripts/c1.md'],
      rounds: 7,
      output: '/data/references/eval-a/samples/q1.json',
      prefix: ['/model big', '/effort high'],
    });

    expect(
      prompt.startsWith(
        '/model big\n/effort high\n\n# Reference memories for AI index `eval-a`, sample `q1`'
      )
    ).toBe(true);
    expect(prompt).toContain('the 1 conversation below (7 rounds)');
    expect(prompt).toContain('- `preference`: What the user likes.');
    expect(prompt).toContain('- `person`: Someone. Attributes: `relation`.');
    expect(prompt).toContain('- `about`: A fact is about an entity');
    expect(prompt).toContain('- `knows`: A person knows a person.');
    expect(prompt).toContain('Record what the user says about themselves.');
    expect(prompt).toContain('- /data/references/eval-a/transcripts/c1.md');
    expect(prompt).toContain('Write one JSON file to /data/references/eval-a/samples/q1.json');

    const factsOnly = referencePrompt({
      aiIndex,
      dreaming: { enabled: true, facts: [{ type: 'preference' }] },
      unit: ALL_SAMPLES,
      transcripts: [],
      rounds: 0,
      output: '/out.json',
      prefix: [],
    });
    expect(factsOnly.startsWith('# Reference memories for AI index `eval-a`\n')).toBe(true);
    expect(factsOnly).toContain('- none: write no entities.');
    expect(factsOnly).toContain('- none: write no relationships.');
    expect(factsOnly).not.toContain('`about`');
  });

  it('lists every unit prompt with its output in the index prompt', () => {
    expect(
      indexPrompt({
        aiIndex,
        units: [{ unit: 'q1', prompt: '/p/q1.md', output: '/o/q1.json' }],
        prefix: ['/model big'],
      })
    ).toContain(
      '/model big\n\n# Reference memories for AI index `eval-a`\n\nWrite the reference memories of 1 unit.'
    );
  });
});
