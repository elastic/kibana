/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANALYZE_AND_IMPROVE_SKILL_ID } from '../../common/constants';
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

const MAX_EXAMPLE_LENGTH = 500;

/** How many targets to spell out before summarising the rest as a count. */
const MAX_HISTORY_TARGETS = 20;

/** How many proposals to name within one target. */
const MAX_HISTORY_ENTRIES_PER_TARGET = 5;

const MAX_REASON_LENGTH = 200;

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

/**
 * What a proposal would change, which is the key its history is worth reading by. `add_*` actions
 * name no existing object, so they group under the subject whose gap they would close, and failing
 * that under the action itself.
 */
const targetKeyOf = ({ action, target }: Improvement): string => {
  if (target?.workflow_id) {
    return `workflow \`${target.workflow_id}\``;
  }
  if (target?.ki_id) {
    return `knowledge indicator \`${target.ki_id}\``;
  }
  if (target?.source_value) {
    return `source \`${target.source_value}\``;
  }
  if (target?.subject) {
    return `subject \`${target.subject}\``;
  }
  return `\`${action}\` (no target named)`;
};

interface TargetHistory {
  key: string;
  improvements: Improvement[];
  rejected: number;
}

/** Groups the history by what each proposal would change, most-contested target first. */
const groupHistoryByTarget = (history: Improvement[]): TargetHistory[] => {
  const byTarget = new Map<string, TargetHistory>();

  for (const improvement of history) {
    const key = targetKeyOf(improvement);
    let entry = byTarget.get(key);
    if (!entry) {
      entry = { key, improvements: [], rejected: 0 };
      byTarget.set(key, entry);
    }
    entry.improvements.push(improvement);
    if (improvement.status === 'rejected') {
      entry.rejected += 1;
    }
  }

  // Most-rejected first, so that what gets cut from the tail is the least decision-relevant.
  return [...byTarget.values()].sort(
    (a, b) =>
      b.rejected - a.rejected ||
      b.improvements.length - a.improvements.length ||
      a.key.localeCompare(b.key)
  );
};

const countByStatus = (history: Improvement[]): string =>
  (['rejected', 'suggested', 'applied', 'failed'] as const)
    .map((status) => ({
      status,
      count: history.filter((improvement) => improvement.status === status).length,
    }))
    .filter(({ count }) => count > 0)
    .map(
      ({ status, count }) =>
        `${count} ${status}${status === 'suggested' ? ' (awaiting review)' : ''}`
    )
    .join(', ');

const renderTargetHistory = ({ key, improvements }: TargetHistory): string => {
  const lines = [`### ${key} — ${improvements.length} proposal(s): ${countByStatus(improvements)}`];

  for (const improvement of improvements.slice(0, MAX_HISTORY_ENTRIES_PER_TARGET)) {
    const reason = improvement.resolution?.reason ?? improvement.resolution?.error;
    lines.push(
      `- **${improvement.status}** — \`${improvement.action}\`: ${improvement.title}${
        reason ? ` (${truncate(reason, MAX_REASON_LENGTH)})` : ''
      }`
    );
  }

  const remaining = improvements.length - MAX_HISTORY_ENTRIES_PER_TARGET;
  if (remaining > 0) {
    lines.push(`- …and ${remaining} more on this target.`);
  }

  return lines.join('\n');
};

/**
 * Prior proposals, grouped by what they would change rather than listed by date. A run does not
 * know what it is about to suggest until it has read the signals, so the briefing cannot pick out
 * the history that will turn out to be relevant. Grouping by target lets the run look its own
 * conclusion up once it has one.
 */
const renderHistory = (history: Improvement[]): string => {
  if (history.length === 0) {
    return [
      '## What was proposed before',
      '',
      'Nothing has been proposed for this index yet.',
    ].join('\n');
  }

  const targets = groupHistoryByTarget(history);
  const detailed = targets.slice(0, MAX_HISTORY_TARGETS);
  const lines = [
    '## What was proposed before',
    '',
    `${history.length} proposal(s) across ${targets.length} target(s) — ${countByStatus(history)}.`,
    '',
    'Grouped by what each would change, most-rejected first. **Before you propose anything, find its target below.** A rejection is a decision that has already been made: re-proposing it wastes a reviewer’s time and it will be de-duplicated onto the same record anyway. A target rejected more than once needs no further proposals unless these signals show something the earlier ones did not, and one already carrying several suggestions awaiting review does not need another.',
    '',
    detailed.map(renderTargetHistory).join('\n\n'),
  ];

  const remainingTargets = targets.length - detailed.length;
  if (remainingTargets > 0) {
    const remainingProposals = targets
      .slice(MAX_HISTORY_TARGETS)
      .reduce((total, { improvements }) => total + improvements.length, 0);
    lines.push(
      '',
      `…and ${remainingTargets} more target(s) carrying ${remainingProposals} proposal(s), none of them rejected more often than those above.`
    );
  }

  return lines.join('\n');
};

const LOAD_SKILL_RULE = `- **Load the \`${ANALYZE_AND_IMPROVE_SKILL_ID}\` skill before you look at anything.** It carries the playbook for reading these signals. If you cannot load it, say so in \`summary\` and work from this briefing alone.`;

const renderTask = (allowedActions: ImprovementAction[]): string => {
  if (allowedActions.length === 0) {
    return [
      '## Your task',
      '',
      'This index is configured for observation only. Report what you found in `summary`. Do not propose changes — none would be recorded.',
      '',
      'Rules for this run:',
      '',
      LOAD_SKILL_RULE,
    ].join('\n');
  }

  return [
    '## Your task',
    '',
    'Work out what would make this AI index serve agents better, and propose it.',
    '',
    'Rules for this run:',
    '',
    LOAD_SKILL_RULE,
    '- **Nobody is watching.** This runs on a schedule. Do not ask clarifying questions; there is no one to answer them. Reach the best conclusion the evidence supports and report it.',
    '- **Propose, do not apply.** Your answer is a proposal for a human to review. Do not write knowledge indicators, edit workflows, or change the index.',
    `- **Only these actions are permitted here**: ${allowedActions
      .map((action) => `\`${action}\``)
      .join(', ')}. Anything else is rejected on write.`,
    '- **Ground every proposal.** Cite the `signal_ids` you took it from, using the ids listed with each group above. A proposal you cannot attach to signals is one you should not make.',
    '- **Check the target’s history once you know what you want to change.** Look it up under "What was proposed before". Reviewers have already ruled on some of these, and their reasons apply to your proposal as much as to the one they rejected.',
    '- **Propose nothing rather than something weak.** An empty list is a valid, useful answer when the signals do not point anywhere. Padding the list costs a reviewer more than it gains.',
    '- **One proposal per distinct problem.** Two groups with the same underlying cause are one fix.',
    '',
    'You may use your tools to look at the index, its knowledge indicators, and the conversations behind these signals before deciding. Answer with the structured output you were given.',
  ].join('\n');
};

/** Renders the prompt for one analysis run. */
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
