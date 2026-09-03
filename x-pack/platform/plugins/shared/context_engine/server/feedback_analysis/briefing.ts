/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import type {
  FeedbackAnalysisRunContext,
  SignalPatternGroup,
} from '../../common/http_api/feedback_context';
import type { ImprovementAction } from '../../common/http_api/improvement_actions';
import type { Improvement } from '../../common/http_api/improvements';
import type { ListKisResponse } from '../../common/http_api/knowledge_indicators';

export interface BriefingInput {
  aiIndex: AiIndexHttpItem;
  run: FeedbackAnalysisRunContext;
  groups: SignalPatternGroup[];
  kiSummary: ListKisResponse['summary'];
  history: Improvement[];
  allowedActions: ImprovementAction[];
}

/** Keeps a quoted query or error from running away with the briefing's budget. */
const MAX_EXAMPLE_LENGTH = 500;

/** How many prior improvements to spell out individually before summarising the rest by status. */
const MAX_HISTORY_DETAIL = 40;

const truncate = (value: string, max: number = MAX_EXAMPLE_LENGTH): string =>
  value.length <= max ? value : `${value.slice(0, max)}…`;

const renderIndex = (aiIndex: AiIndexHttpItem, kiSummary: ListKisResponse['summary']): string => {
  const lines = [
    '## The AI index under analysis',
    '',
    `- **id**: \`${aiIndex.id}\``,
    `- **destination**: \`${aiIndex.dest.value}\` (${aiIndex.dest.type})`,
  ];

  if (aiIndex.description) {
    lines.push(`- **description**: ${aiIndex.description}`);
  }

  const byType = kiSummary.counts_by_type
    .map(({ type, count }) => `\`${type}\` × ${count}`)
    .join(', ');
  lines.push(
    `- **knowledge indicators**: ${kiSummary.total}${byType ? ` — ${byType}` : ''}`,
    `- **sources**: ${
      aiIndex.sources.length === 0
        ? 'none configured'
        : aiIndex.sources.map((source) => `\`${source.value}\` (${source.type})`).join(', ')
    }`,
    `- **automations**: ${
      aiIndex.automations.length === 0
        ? 'none configured'
        : aiIndex.automations.map((automation) => `\`${automation.value}\``).join(', ')
    }`
  );

  return lines.join('\n');
};

const renderGroup = (group: SignalPatternGroup, rank: number): string => {
  const lines = [
    `### ${rank}. \`${group.tag}\` on \`${group.target_index}\` via \`${group.tool}\` — ${group.count} signal(s)`,
  ];

  if (group.example?.query) {
    lines.push('', 'Example query:', '```esql', truncate(group.example.query), '```');
  }
  if (group.example?.error) {
    lines.push('', `Example error: \`${truncate(group.example.error)}\``);
  }
  if (group.example && !group.example.error) {
    lines.push('', `Rows returned by the example: ${group.example.row_count}`);
  }

  lines.push('', `Signal ids: ${group.signal_ids.map((id) => `\`${id}\``).join(', ')}`);

  return lines.join('\n');
};

const renderGroups = (groups: SignalPatternGroup[], run: FeedbackAnalysisRunContext): string => {
  const header = [
    '## What the signals show',
    '',
    `${run.signal_count} signal(s) from ${run.signal_spaces.length || 'no'} space(s) between ${
      run.signal_window.from
    } and ${
      run.signal_window.to
    }, folded into the recurring shapes below and ordered by how much they matter.`,
  ].join('\n');

  if (groups.length === 0) {
    return [
      header,
      '',
      'None of the selected signals were classified as a problem. Retrievals against this index ran and returned rows.',
    ].join('\n');
  }

  return [header, '', ...groups.map((group, index) => renderGroup(group, index + 1))].join('\n\n');
};

const renderHistory = (history: Improvement[]): string => {
  if (history.length === 0) {
    return [
      '## What was proposed before',
      '',
      'Nothing has been proposed for this index yet.',
    ].join('\n');
  }

  const detailed = history.slice(0, MAX_HISTORY_DETAIL);
  const lines = [
    '## What was proposed before',
    '',
    'Do not propose any of these again. A rejection is a decision that has already been made; re-proposing it wastes a reviewer’s time and it will be de-duplicated onto the same record anyway.',
    '',
  ];

  for (const improvement of detailed) {
    const reason = improvement.resolution?.reason ?? improvement.resolution?.error;
    lines.push(
      `- **${improvement.status}** — \`${improvement.action}\`: ${improvement.title}${
        reason ? ` (${truncate(reason, 200)})` : ''
      }`
    );
  }

  const remaining = history.length - detailed.length;
  if (remaining > 0) {
    lines.push(`- …and ${remaining} more.`);
  }

  return lines.join('\n');
};

const renderTask = (allowedActions: ImprovementAction[]): string => {
  if (allowedActions.length === 0) {
    return [
      '## Your task',
      '',
      'This index is configured for observation only. Report what you found in `summary`. Do not propose changes — none would be recorded.',
    ].join('\n');
  }

  return [
    '## Your task',
    '',
    'Work out what would make this AI index serve agents better, and propose it.',
    '',
    'Rules for this run:',
    '',
    '- **Nobody is watching.** This runs on a schedule. Do not ask clarifying questions; there is no one to answer them. Reach the best conclusion the evidence supports and report it.',
    '- **Propose, do not apply.** Your answer is a proposal for a human to review. Do not write knowledge indicators, edit workflows, or change the index.',
    `- **Only these actions are permitted here**: ${allowedActions
      .map((action) => `\`${action}\``)
      .join(', ')}. Anything else is rejected on write.`,
    '- **Ground every proposal.** Cite the `signal_ids` you took it from, using the ids listed with each group above. A proposal you cannot attach to signals is one you should not make.',
    '- **Propose nothing rather than something weak.** An empty list is a valid, useful answer when the signals do not point anywhere. Padding the list costs a reviewer more than it gains.',
    '- **One proposal per distinct problem.** Two groups with the same underlying cause are one fix.',
    '',
    'You may use your tools to look at the index, its knowledge indicators, and the conversations behind these signals before deciding. Answer with the structured output you were given.',
  ].join('\n');
};

/**
 * Renders the prompt for one analysis run.
 *
 * Built here rather than in the workflow template so both callers — the schedule and the
 * interactive button — send the agent the same thing, and so the wording can be tested.
 */
export const renderBriefing = ({
  aiIndex,
  run,
  groups,
  kiSummary,
  history,
  allowedActions,
}: BriefingInput): string =>
  [
    `# Feedback analysis for AI index \`${aiIndex.id}\``,
    '',
    renderIndex(aiIndex, kiSummary),
    '',
    renderGroups(groups, run),
    '',
    renderHistory(history),
    '',
    renderTask(allowedActions),
  ].join('\n');
