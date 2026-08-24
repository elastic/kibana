/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexHttpItem } from '../http_api/ai_indices';
import type { FeedbackContext } from '../http_api/feedback_loop';
import type { ImprovementEnvelope } from '../http_api/improvements';
import type { SignalGroup } from '../http_api/signals';
import { MAX_IMPROVEMENTS_PER_RUN } from '../constants';

/** The structured context a prompt is rendered from; `prompt` itself is the output. */
export type FeedbackPromptInput = Omit<FeedbackContext, 'prompt'>;

const NONE = 'none';

const renderList = (items: string[]): string => (items.length ? items.join('\n') : `- ${NONE}`);

const renderAiIndex = (aiIndex: AiIndexHttpItem): string =>
  [
    `- id: ${aiIndex.id}${
      aiIndex.managed ? ' (managed — its configuration cannot be edited)' : ''
    }`,
    `- description: ${aiIndex.description || NONE}`,
    `- destination: ${aiIndex.dest.type} \`${aiIndex.dest.value}\` (where Knowledge Indicators are stored)`,
    '- sources:',
    renderList(aiIndex.sources.map((source) => `  - ${source.type}: ${source.value}`)),
    '- automations:',
    renderList(aiIndex.automations.map((automation) => `  - workflow: ${automation.value}`)),
  ].join('\n');

const renderKiSummary = ({
  count,
  counts_by_type: countsByType,
}: FeedbackPromptInput['ki_summary']) =>
  [
    `- total: ${count}`,
    '- by type:',
    renderList(countsByType.map(({ type, count: typeCount }) => `  - ${type}: ${typeCount}`)),
  ].join('\n');

const renderSignals = (signalGroups: SignalGroup[], signalsIndex: string): string =>
  [
    `Signals are classified observations of how agents actually used this AI index. They live in \`${signalsIndex}\`; query them with ES|QL to read the individual observations behind a tag, for example:`,
    '',
    `    FROM ${signalsIndex} | WHERE tags == "<tag>" | SORT @timestamp DESC | LIMIT 20`,
    '',
    'Counts per tag:',
    renderList(signalGroups.map(({ tag, count }) => `- ${tag}: ${count}`)),
  ].join('\n');

/** One line per past suggestion: enough to recognize a duplicate, without replaying its payload. */
const renderImprovement = (improvement: ImprovementEnvelope): string => {
  const resolvedAt =
    improvement.status === 'applied'
      ? improvement.applied_at
      : improvement.status === 'rejected'
      ? improvement.rejected_at
      : undefined;
  const target = improvement.target?.ki_id ?? improvement.target?.workflow_id;
  const parts = [
    `- [${improvement.status}] ${improvement.action}: ${improvement.title}`,
    target ? ` (target: ${target})` : '',
    ` — suggested ${improvement.suggested_at}`,
    resolvedAt ? `, resolved ${resolvedAt}` : '',
    improvement.resolution?.error ? `, error: ${improvement.resolution.error}` : '',
  ];
  return parts.join('');
};

const renderImprovements = (improvements: ImprovementEnvelope[]): string =>
  [
    'Every suggestion ever made for this AI index, with its outcome:',
    renderList(improvements.map(renderImprovement)),
    '',
    'Do not repeat anything already `applied` (it is in place) or `rejected` (the user refused it). A `proposed` suggestion is still awaiting review, so do not restate it either. A `failed` suggestion may be re-proposed only if you can address the error above.',
  ].join('\n');

/**
 * Renders the task briefing handed to the feedback agent. Self-contained on purpose: the same text
 * is used for the scheduled run and the interactive hand-off, and the interactive path may run a
 * user-chosen agent that does not carry the built-in agent's standing instructions.
 */
export const buildFeedbackLoopPrompt = ({
  ai_index: aiIndex,
  ki_summary: kiSummary,
  signal_groups: signalGroups,
  improvements,
  signals_index: signalsIndex,
}: FeedbackPromptInput): string =>
  [
    '# Task',
    '',
    `Analyze the signals for AI index \`${aiIndex.id}\` and propose concrete improvements to its Knowledge Indicators and automations.`,
    '',
    'Work autonomously. Never ask the user a question and never call a tool that asks one — nobody is watching this run. If the evidence does not support a change, propose nothing; an empty list is a valid and useful answer.',
    '',
    '# AI index',
    '',
    renderAiIndex(aiIndex),
    '',
    '# Knowledge Indicators',
    '',
    'A Knowledge Indicator (KI) is one document in the destination above: a titled, tagged piece of context that agents retrieve when answering questions.',
    '',
    renderKiSummary(kiSummary),
    '',
    '# Signals',
    '',
    renderSignals(signalGroups, signalsIndex),
    '',
    '# Prior suggestions',
    '',
    renderImprovements(improvements),
    '',
    '# What to propose',
    '',
    `Return at most ${MAX_IMPROVEMENTS_PER_RUN} suggestions, each grounded in a signal you actually read. Every suggestion needs an \`action\`, a short \`title\`, and a \`rationale\` naming the evidence behind it.`,
    '',
    '- `add_ki` — retrievals find nothing for a topic the index should cover. Provide the new KI in `ki`.',
    '- `edit_ki` — an existing KI is retrieved but is wrong, stale, or too thin to answer with. Provide `target_ki_id` and the replacement fields in `ki`.',
    '- `remove_ki` — a KI is misleading, duplicated, or never useful. Provide `target_ki_id`. Removal is soft: the KI is flagged as deleted, not erased.',
    '- `add_workflow` — the index needs recurring maintenance or ingestion it does not have. Provide the definition in `workflow_yaml`.',
    '- `edit_workflow` — a linked automation is failing or producing the wrong content. Provide `target_workflow_id` and the corrected `workflow_yaml`.',
    '- `remove_workflow` — a linked automation is redundant or harmful. Provide `target_workflow_id`. Removal is soft: the workflow is disabled and unlinked, not deleted.',
    '',
    'Every suggestion is reviewed by a human before it takes effect, so be specific enough to judge: say which signals motivated it and what changes as a result.',
  ].join('\n');
