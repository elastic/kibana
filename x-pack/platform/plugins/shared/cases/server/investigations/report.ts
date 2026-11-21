/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActivityEntry,
  ClaimItem,
  InvestigationItem,
  InvestigationRecord,
  ProposalItem,
  RecordCounters,
  TaskItem,
  TimelineEventItem,
} from '../../common/investigations/types';
import { EVIDENCE_TYPE_LABELS, VERDICT_LABELS } from '../../common/investigations/types';

const fmt = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 19)} UTC`;
};

const statusLabel = (r: InvestigationRecord): string =>
  r.status === 'closed' ? 'Closed' : r.owner ? 'In progress' : 'Needs owner';

/** Builds a readable Markdown report of findings, actions, evidence and timeline. */
export const buildReport = ({
  record,
  counters,
  claims,
  proposals,
  tasks,
  timeline,
  activity,
}: {
  record: InvestigationRecord;
  counters: RecordCounters;
  claims: ClaimItem[];
  proposals: ProposalItem[];
  tasks: TaskItem[];
  timeline: InvestigationItem[];
  activity: ActivityEntry[];
}): string => {
  const ln: string[] = [];
  ln.push(`# ${record.display_id}: ${record.title}`, '');
  ln.push(
    `Status: ${statusLabel(record)}. Owner: ${record.owner?.name ?? 'Unassigned'}. Priority: ${record.priority}. Type: ${record.investigation_type}.`,
    `Opened ${fmt(record.created_at)} (${record.origin.label}).${record.closed_at ? ` Closed ${fmt(record.closed_at)}.` : ''}`,
    ''
  );
  ln.push('## Summary', '', record.close_outcome?.summary ?? record.summary ?? record.description, '');
  const agent = record.agent_verdict;
  const analyst = record.analyst_verdict;
  ln.push('## Verdict', '');
  if (analyst) {
    ln.push(
      `Analyst determination: ${VERDICT_LABELS[analyst.verdict]} (set by ${analyst.set_by.name}).${analyst.reason ? ` ${analyst.reason}` : ''}` +
        (agent ? ` Agent verdict (superseded): ${agent.label} (${agent.confidence}%).` : '')
    );
  } else if (agent) {
    ln.push(`Agent verdict: ${agent.label} (${agent.confidence}%). No analyst determination yet.`);
  } else {
    ln.push('No determination yet.');
  }
  if (record.close_outcome) {
    ln.push(
      '',
      `Closed by ${record.close_outcome.closed_by.name}. Close reason: ${record.close_outcome.close_reason.replace(/_/g, ' ')}.${
        record.close_outcome.human_verdict
          ? ` Verdict: ${VERDICT_LABELS[record.close_outcome.human_verdict]}.`
          : ''
      }${record.close_outcome.summary ? ` Notes: ${record.close_outcome.summary}` : ''}`
    );
  }
  ln.push('');

  if (timeline.length) {
    ln.push('## Timeline of the activity', '');
    for (const item of timeline as TimelineEventItem[]) {
      const ev = item.timeline_event;
      ln.push(`- ${fmt(ev.occurred_at)}: ${item.title} [${ev.actor.name}]${ev.flag === 'suspected' ? ' (suspected)' : ''}`);
    }
    ln.push('');
  }

  ln.push('## Claims', '');
  if (!claims.length) ln.push('- No claims.');
  for (const c of claims) {
    const conf = c.claim.confidence !== null && c.claim.confidence !== undefined ? `, ${c.claim.confidence}%` : '';
    const text = c.status === 'supported' || c.status === 'refuted' ? c.claim.conclusion ?? c.claim.question : c.claim.question;
    ln.push(
      `- ${c.ref} (${c.status}${conf}): ${text}${c.claim.note ? ` Note: ${c.claim.note}` : ''} Raised by ${c.created_by.name}.${c.claim.needs_review ? ' Needs review.' : ''}`
    );
  }
  ln.push('', '## Actions and approvals', '');
  if (!proposals.length) ln.push('- No proposed actions.');
  for (const p of proposals) {
    const d = p.proposal.decision;
    const state =
      p.status === 'approved'
        ? `approved by ${d?.by.name ?? 'unknown'}`
        : p.status === 'rejected'
        ? `rejected by ${d?.by.name ?? 'unknown'}${d?.reason ? ` (${d.reason})` : ''}`
        : p.status;
    ln.push(`- ${p.title} [${p.proposal.category}]: ${state}`);
  }
  ln.push('', `## Procedure (${record.investigation_type})`, '');
  if (!tasks.length) ln.push('- No procedure applied.');
  for (const t of tasks) {
    const box = t.status === 'completed' ? '[x]' : t.status === 'cancelled' ? '[n/a]' : '[ ]';
    const by = t.task.completed_by ? ` (${t.task.completed_by.name}${t.task.note ? `: ${t.task.note}` : ''}${t.task.cancel_reason ? `: ${t.task.cancel_reason}` : ''})` : '';
    ln.push(`- ${box} ${t.title}${t.task.required ? '' : ' (optional)'}${by}`);
  }
  const byType = Object.entries(counters.evidence_by_type)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([k, n]) => `${(n ?? 0).toLocaleString('en-US')} ${EVIDENCE_TYPE_LABELS[k as keyof typeof EVIDENCE_TYPE_LABELS]?.toLowerCase() ?? k}`);
  ln.push(
    '',
    '## Evidence',
    '',
    `${counters.evidence.toLocaleString('en-US')} items${byType.length ? `: ${byType.join(', ')}` : ''}. Each item keeps its source, who added it and, where preserved, a copy with a SHA-256 hash.`,
    ''
  );
  ln.push('## Response log', '');
  for (const e of activity) {
    ln.push(`- ${fmt(e.ts)} ${e.actor.name}${e.actor.on_behalf_of ? ` on behalf of ${e.actor.on_behalf_of}` : ''}: ${e.message}`);
  }
  ln.push('', `Generated ${fmt(new Date().toISOString())}.`);
  return ln.join('\n');
};
