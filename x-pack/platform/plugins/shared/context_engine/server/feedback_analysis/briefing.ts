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
import type { ImprovementHistorySummary } from '../../common/http_api/improvements';
import { IMPROVEMENT_STATUSES, IMPROVEMENTS_INDEX } from '../../common/http_api/improvements';
import type { ListKisResponse } from '../../common/http_api/knowledge_indicators';

export interface BriefingInput {
  aiIndex: AiIndexHttpItem;
  run: FeedbackAnalysisRunContext;
  groups: SignalPatternGroup[];
  kiSummary: ListKisResponse['summary'];
  history: ImprovementHistorySummary;
  allowedActions: ImprovementAction[];
}

const MAX_EXAMPLE_LENGTH = 500;

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

const countByStatus = ({ by_status: byStatus }: ImprovementHistorySummary): string =>
  IMPROVEMENT_STATUSES.map((status) => ({ status, count: byStatus[status] ?? 0 }))
    .filter(({ count }) => count > 0)
    .map(
      ({ status, count }) =>
        `${count} ${status}${status === 'suggested' ? ' (awaiting review)' : ''}`
    )
    .join(', ');

/**
 * What came before, as counts plus the query that reads it.
 *
 * A run does not know what it is about to propose until it has read the signals, so a briefing
 * cannot pick out the history that will turn out to be relevant. Listing all of it does not scale
 * either — an index accumulates more targets than fit in a prompt, and the ones that fit are not
 * the ones the run needs. So the briefing says only how much history exists, and hands over the
 * query to pull the lineage of whatever the run settles on.
 *
 * The query lives here rather than only in the skill because a briefing is the one part of a run
 * that cannot be replaced by configuring a different agent.
 */
const renderHistory = (aiIndexId: string, history: ImprovementHistorySummary): string => {
  if (history.total === 0) {
    return [
      '## What was proposed before',
      '',
      'Nothing has been proposed for this index yet, so there is no history to check.',
    ].join('\n');
  }

  return [
    '## What was proposed before',
    '',
    `${history.total} proposal(s) for this index — ${countByStatus(history)}.`,
    '',
    'They are not listed here: which of them matter depends on what you decide to propose, which you do not know yet. **Once you know what you want to change, read that target’s history before proposing it**, with `platform.core.execute_esql`:',
    '',
    '```esql',
    `FROM ${IMPROVEMENTS_INDEX}`,
    `| WHERE ai_index_id == "${aiIndexId}" AND latest == true`,
    '| WHERE target.workflow_id == "<the workflow you would change>"',
    '| KEEP @timestamp, status, action, title, rationale, resolution.reason, resolution.error',
    '| SORT @timestamp DESC',
    '| LIMIT 20',
    '```',
    '',
    'Swap the second `WHERE` for what your proposal targets: `target.ki_id` for a knowledge indicator, `target.workflow_id` for an automation, `target.subject` for an `add_*` action, which names what the addition would cover rather than an object that exists yet. To see everything a reviewer has turned down here, drop that line and filter `status == "rejected"` instead.',
    '',
    'A rejection is a decision that has already been made: re-proposing it wastes a reviewer’s time, and it will be de-duplicated onto the same record anyway. Read `resolution.reason` rather than assuming the change was wrong — a proposal can be turned down as a duplicate, as poorly evidenced, or as badly timed, and each points somewhere different. A target already carrying suggestions awaiting review does not need another.',
  ].join('\n');
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
    '- **Check the target’s history once you know what you want to change.** Run the query under "What was proposed before" against it. Reviewers have already ruled on some of these, and their reasons apply to your proposal as much as to the one they rejected.',
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
    renderHistory(aiIndex.id, history),
    '',
    renderTask(allowedActions),
  ].join('\n');
