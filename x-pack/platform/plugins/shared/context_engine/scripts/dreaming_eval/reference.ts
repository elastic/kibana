/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { z } from '@kbn/zod/v4';
import type { AiIndexDreamingConfig } from '../../common/dreaming';
import { ABOUT_RELATIONSHIP_TYPE, dreamingTypesOf } from '../../common/dreaming';
import type { AiIndexEvalConfig, EvalConfig } from './config';
import type { EvalConversation } from './types';

/**
 * Reference memories: what a memory pipeline that worked well would extract from a sample's
 * conversations, written by a coding agent from the prompt the reference stage writes.
 */
const evidenceSchema = z.object({
  conversation: z.string().min(1),
  round: z.number().int().min(0).optional(),
});

const memoryShape = {
  id: z.string().min(1),
  /** Exact terms, such as names, numbers and dates, that every correct KI for it contains. */
  keywords: z.array(z.string()).default([]),
  evidence: z.array(evidenceSchema).default([]),
  /** Worth having but not required: matching it counts, missing it does not. */
  optional: z.boolean().default(false),
};

const referenceEntitySchema = z.object({
  ...memoryShape,
  type: z.string().min(1),
  /** The canonical name. */
  title: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  description: z.string().optional(),
  content: z.string().optional(),
  attributes: z.record(z.string(), z.string()).default({}),
});

const referenceFactSchema = z.object({
  ...memoryShape,
  type: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
});

const referenceRelationshipSchema = z.object({
  id: z.string().optional(),
  type: z.string().min(1),
  /** Ids of a reference entity or fact. */
  from: z.string().min(1),
  to: z.string().min(1),
  description: z.string().optional(),
  evidence: z.array(evidenceSchema).default([]),
  optional: z.boolean().default(false),
});

const referenceMemoriesSchema = z.object({
  entities: z.array(referenceEntitySchema).default([]),
  facts: z.array(referenceFactSchema).default([]),
  relationships: z.array(referenceRelationshipSchema).default([]),
});

export type ReferenceEntity = z.output<typeof referenceEntitySchema>;
export type ReferenceFact = z.output<typeof referenceFactSchema>;
export type ReferenceRelationship = z.output<typeof referenceRelationshipSchema>;
export type ReferenceMemories = z.output<typeof referenceMemoriesSchema>;

/** Parses a reference memories file, and checks that ids are unique and relationships resolve. */
export const parseReferenceMemories = (value: unknown, file: string): ReferenceMemories => {
  const parsed = referenceMemoriesSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`Invalid reference memories ${file}:\n${z.prettifyError(parsed.error)}`);
  }
  const { entities, facts, relationships } = parsed.data;
  const ids = [...entities, ...facts].map(({ id }) => id);
  const problems = [
    ...ids.filter((id, index) => ids.indexOf(id) !== index).map((id) => `id '${id}' is used twice`),
    ...relationships.flatMap(({ from, to, type }) =>
      [from, to]
        .filter((end) => !ids.includes(end))
        .map((end) => `relationship ${from} ${type} ${to}: no entity or fact '${end}'`)
    ),
  ];
  if (problems.length > 0) {
    throw new Error(`Invalid reference memories ${file}:\n${problems.join('\n')}`);
  }
  return parsed.data;
};

/** The unit a reference is for: one sample, or all of a run's conversations when they dream together. */
export const ALL_SAMPLES = 'all';

/** Where the reference memories, transcripts and prompts of an AI index go. */
export const referenceDirOf = (config: EvalConfig, aiIndex: AiIndexEvalConfig): string =>
  aiIndex.references
    ? path.resolve(process.cwd(), aiIndex.references)
    : path.join(config.dataDir, 'references', aiIndex.id);

export const referenceFileOf = (dir: string, unit: string): string =>
  unit === ALL_SAMPLES
    ? path.join(dir, 'memories.json')
    : path.join(dir, 'samples', `${unit}.json`);

export const promptFileOf = (dir: string, unit: string): string =>
  path.join(dir, 'prompts', `${unit}.md`);

export const indexPromptFileOf = (dir: string): string => path.join(dir, 'PROMPT.md');

/** What the reference stage wrote: which conversations each unit's reference is made from. */
export interface ReferenceManifest {
  aiIndexId: string;
  datasets: string[];
  /** The dataset options the conversations were extracted with, such as variant or haystack. */
  extractedWith: Record<string, unknown>;
  dreamingFrom: 'kibana' | 'config';
  writtenAt: string;
  units: Array<{ unit: string; conversations: string[]; prompt: string; output: string }>;
}

export const referenceManifestFileOf = (dir: string): string => path.join(dir, 'manifest.json');

/** A file name for a conversation id: ids can hold characters a path cannot. */
export const transcriptFileOf = (dir: string, conversationId: string): string =>
  path.join(dir, 'transcripts', `${conversationId.replace(/[^A-Za-z0-9_.-]/g, '_')}.md`);

/** A conversation as the memory pipeline reads it: each round with who said what, and when. */
export const renderTranscript = ({ id, title, rounds }: EvalConversation): string =>
  [
    `# ${title}`,
    '',
    `Conversation \`${id}\`, ${rounds.length} round${rounds.length === 1 ? '' : 's'}.`,
    '',
    ...rounds.flatMap(({ startedAt, user, steps, answer }, index) => [
      `## Round ${index} (${startedAt})`,
      '',
      `User: ${user}`,
      '',
      ...steps.flatMap(({ thought, tool, arguments: args, result }) => [
        ...(thought ? [`Assistant (thinking): ${thought}`, ''] : []),
        `Assistant called ${tool}: ${args}`,
        '',
        `Tool result: ${result}`,
        '',
      ]),
      `Assistant: ${answer}`,
      '',
    ]),
  ].join('\n');

/** The AI index as Context Engine stores it: its id, description and whole dreaming config. */
export const aiIndexConfigOf = (
  { id, description }: AiIndexEvalConfig,
  dreaming: AiIndexDreamingConfig
) => ({ id, ...(description && { description }), dreaming });

const configSection = (aiIndex: AiIndexEvalConfig, dreaming: AiIndexDreamingConfig): string[] => [
  '## AI index config',
  '',
  'The AI index as Context Engine stores it. `dreaming.instructions` is what the pipeline is told; `dreaming.facts`, `dreaming.entities.nodes` and `dreaming.relationships` are the types it builds, with what each is for.',
  '',
  '```json',
  JSON.stringify(aiIndexConfigOf(aiIndex, dreaming), null, 2),
  '```',
];

const OUTPUT_EXAMPLE = {
  entities: [
    {
      id: 'e1',
      type: '<entity type>',
      title: 'Canonical name',
      aliases: ['Other name it goes by'],
      description: 'One line on what it is.',
      content: 'What is known about it: its attribute values and the main facts about it.',
      attributes: { '<attribute key>': 'value' },
      keywords: ['Canonical name'],
      evidence: [{ conversation: '<conversation id>', round: 0 }],
    },
  ],
  facts: [
    {
      id: 'f1',
      type: '<fact type>',
      title: 'Short label that names what it is about',
      content: 'The fact, standing on its own, with exact names, numbers and full dates.',
      keywords: ['exact name', '45 minutes'],
      evidence: [{ conversation: '<conversation id>', round: 3 }],
    },
  ],
  relationships: [
    { type: '<relationship type>', from: 'e1', to: 'e2', description: 'Why it holds.' },
  ],
};

export interface ReferencePromptInput {
  aiIndex: AiIndexEvalConfig;
  dreaming: AiIndexDreamingConfig;
  unit: string;
  transcripts: string[];
  rounds: number;
  output: string;
  prefix: string[];
}

/** The prompt that has a coding agent write the reference memories of one unit. */
export const referencePrompt = ({
  aiIndex,
  dreaming,
  unit,
  transcripts,
  rounds,
  output,
  prefix,
}: ReferencePromptInput): string => {
  const { facts, entities, relationships } = dreamingTypesOf(dreaming);
  return [
    ...prefix,
    ...(prefix.length > 0 ? [''] : []),
    `# Reference memories for AI index \`${aiIndex.id}\`${
      unit === ALL_SAMPLES ? '' : `, sample \`${unit}\``
    }`,
    '',
    `A memory pipeline reads an agent's past conversations and writes long-term memories to the AI index \`${
      aiIndex.id
    }\`${
      aiIndex.description ? ` (${aiIndex.description})` : ''
    }. Write the memories that pipeline would write if it worked perfectly on the ${
      transcripts.length
    } conversation${transcripts.length === 1 ? '' : 's'} below (${rounds} round${
      rounds === 1 ? '' : 's'
    }): every memory these conversations call for, and nothing they do not. The pipeline's output is compared with yours without an LLM, so be exact and complete.`,
    '',
    '## What to record',
    '',
    'Take from a round only what it states or settles: what the user says about themselves, their work, their preferences and their data, and what the tool results and the answer establish. Do not record what the agent only suggested, guessed or asked, small talk, a one-off request, or a step of a task that does not stay true afterwards. A tool result is evidence; a failed or empty one establishes nothing.',
    '',
    'Write one memory per piece of knowledge across all the conversations: when later rounds restate or refine it, keep one memory with the refined values; when they change it, keep the latest state and say what it was before only when that matters. Read every conversation, including ones that look unrelated: whatever they establish counts.',
    ...(facts.length > 0
      ? [
          '',
          'Facts are read on their own, without the conversation: name what each is about in its title and content, keep every name, number, code and date exactly as stated, and give dates in full, worked out from when the round happened, rather than "yesterday" or "next week". State the knowledge itself rather than quoting the conversation. When a round holds several separate pieces of knowledge, write a fact for each.',
        ]
      : []),
    ...(entities.length > 0
      ? [
          '',
          'An entity is one thing the conversations are about, under its canonical name, with the other names it goes by as aliases. Give it a content summary of what is known about it, and values for the attribute keys its type has where the conversations give them.',
        ]
      : []),
    '',
    ...configSection(aiIndex, dreaming),
    '',
    '## Types',
    '',
    `- Use only the types of the config. ${
      [
        facts.length === 0 && 'It has no fact types: write no facts.',
        entities.length === 0 && 'It has no entity types: write no entities.',
      ]
        .filter(Boolean)
        .join(' ') || 'Give each memory one of them in `type`.'
    }`,
    ...(entities.length > 0
      ? ["- An entity's `attributes` are the keys its type lists in `dreaming.entities.nodes`."]
      : []),
    relationships.length > 0
      ? `- Relationships read "from type to"; from and to are ids of your entities and facts. Besides the configured types, the built-in \`${ABOUT_RELATIONSHIP_TYPE}\` links a fact to an entity it is about (from the fact, to the entity), and is the only type from a fact. Every configured type links two entities: use one only when its description fits both ends.`
      : '- It has no relationship types: write no relationships.',
    '',
    '## Conversations',
    '',
    'Each file is one conversation: its rounds in order with the time each happened, what the user sent, the tools the assistant called with their results, and its answer.',
    '',
    ...transcripts.map((file) => `- ${file}`),
    '',
    '## Output',
    '',
    `Write one JSON file to ${output}, with the shape below, and nothing else. Then check that it parses, that ids are unique, and that every relationship's from and to is one of your ids.`,
    '',
    '- `id`: your own short id, unique in the file, such as e1 or f1.',
    '- `keywords`: 1 to 4 exact terms from the conversations that any correct memory of it must contain, such as names, numbers, amounts, dates and codes. Leave out common words: a memory that says the same thing in other words should still contain every keyword.',
    '- `evidence`: the conversations (and rounds) it comes from.',
    '- `optional: true` on a memory worth having that a good pipeline might fairly skip; leave it out on the rest.',
    '- `attributes` (entities only): the attribute keys of its type, with the values the conversations give.',
    '',
    '```json',
    JSON.stringify(OUTPUT_EXAMPLE, null, 2),
    '```',
    '',
  ].join('\n');
};

/** The prompt that has a coding agent write the reference memories of every unit, one prompt each. */
export const indexPrompt = ({
  aiIndex,
  dreaming,
  units,
  prefix,
}: {
  aiIndex: AiIndexEvalConfig;
  dreaming: AiIndexDreamingConfig;
  units: Array<{ unit: string; prompt: string; output: string }>;
  prefix: string[];
}): string =>
  [
    ...prefix,
    ...(prefix.length > 0 ? [''] : []),
    `# Reference memories for AI index \`${aiIndex.id}\``,
    '',
    `Write the reference memories of ${units.length} ${
      units.length === 1 ? 'unit' : 'units'
    }. Each has its own prompt with the conversations to read and the file to write. Do each prompt in full and on its own, one subagent per prompt where you can, several at a time; skip a unit whose output file already exists and parses. When all are done, list the units and how many entities, facts and relationships each has.`,
    '',
    ...units.map(({ unit, prompt, output }) => `- ${unit}: ${prompt} → ${output}`),
    '',
    ...configSection(aiIndex, dreaming),
    '',
  ].join('\n');
