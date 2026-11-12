/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseConfig } from './config';
import {
  aiIndexConfigOf,
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

  it('prompts with the whole AI index config, the transcripts, the output file and the prefix', () => {
    const dreaming = {
      enabled: true,
      instructions: 'Record what the user says about themselves.',
      facts: [{ type: 'preference', description: 'What the user likes.' }],
      entities: {
        nodes: [{ type: 'person', description: 'Someone.', attributes: ['relation'] }],
      },
      relationships: [{ type: 'knows', description: 'A person knows a person.' }],
    };
    const prompt = referencePrompt({
      aiIndex,
      dreaming,
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
    expect(prompt).toContain(
      'You are writing the answer key that our memory pipeline is evaluated against.'
    );
    expect(prompt).toContain(
      'This prompt covers sample `q1`: the 1 conversation listed below (7 rounds). Write its memory to /data/references/eval-a/samples/q1.json.'
    );
    expect(aiIndexConfigOf(aiIndex, dreaming)).toEqual({
      id: 'eval-a',
      description: 'What the assistant learned about its user.',
      dreaming,
    });
    expect(prompt).toContain(
      ['```json', JSON.stringify(aiIndexConfigOf(aiIndex, dreaming), null, 2), '```'].join('\n')
    );
    expect(prompt).toContain('the built-in `about` links a fact to an entity');
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
    expect(factsOnly).toContain('It has no entity types: write no entities.');
    expect(factsOnly).toContain('It has no relationship types: write no relationships.');
    expect(factsOnly).not.toContain('`about`');
  });

  it('lists every unit prompt with its output in the index prompt, with the AI index config', () => {
    const prompt = indexPrompt({
      aiIndex,
      dreaming: { enabled: true, facts: [{ type: 'preference' }] },
      units: [{ unit: 'q1', prompt: '/p/q1.md', output: '/o/q1.json' }],
      prefix: ['/model big'],
    });

    expect(prompt).toContain(
      '/model big\n\n# Reference memories for AI index `eval-a`\n\n## Goal\n\nYou are writing the answer key'
    );
    expect(prompt).toContain('The transcripts come in 1 unit, each evaluated on its own');
    expect(prompt).toContain('- q1: /p/q1.md → /o/q1.json');
    expect(prompt).toContain('## AI index config');
    expect(prompt).toContain('"type": "preference"');
  });
});
