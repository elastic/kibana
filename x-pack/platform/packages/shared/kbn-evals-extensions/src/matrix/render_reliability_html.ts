/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Matrix, MatrixCell, MatrixRow } from './build_matrix';
import type { MatrixProvenance } from './render_matrix';
import type { MatrixTraceData } from './trace_types';
import { rowAgreement, type TrajectoryCell } from './trajectory_agreement';

const esc = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const cellValue = (cell: MatrixCell): string => {
  switch (cell.kind) {
    case 'score':
      return cell.value.toFixed(2);
    case 'not-recommended':
      return 'Not recommended';
    case 'excluded':
      return `Excluded: ${cell.reason}`;
    case 'insufficient-coverage':
      return `Insufficient: ${cell.covered}/${cell.required}`;
    case 'missing':
      return 'Unmeasured';
  }
};

/**
 * Converts only direct example trace keys into reliability cells. Prefix and
 * suite aliases do not carry repTrails, preventing double-counting.
 */
export const reliabilityCellsFromTraces = (traces: MatrixTraceData = {}): TrajectoryCell[] =>
  Object.entries(traces).flatMap(([key, trace]) => {
    if (!trace.repTrails) {
      return [];
    }
    const split = key.indexOf(':');
    if (split < 1) {
      return [];
    }
    return [
      {
        model: key.slice(0, split),
        example: key.slice(split + 1),
        trails: trace.repTrails,
      },
    ];
  });

const rowHtml = (row: MatrixRow, cells: TrajectoryCell[]): string => {
  const agreement = rowAgreement(cells, row.modelId);
  const reliability =
    agreement.status === 'unmeasured'
      ? '<span class="unmeasured">Unmeasured</span>'
      : `<strong>${((agreement.identicalRate ?? 0) * 100).toFixed(0)}%</strong>` +
        `<small>${agreement.measuredCells} repeated cells · ${(
          (agreement.sequenceSimilarity ?? 0) * 100
        ).toFixed(0)}% path similarity</small>`;
  const tier = row.tier === undefined ? '—' : `Tier ${row.tier}`;
  return `<tr>
    <td class="model">${esc(row.modelLabel)}<small>${esc(row.modelId)}</small></td>
    <td class="metric">${esc(
      cellValue(row.capability ?? { kind: 'missing' })
    )}<small>deterministic contract evaluators</small></td>
    <td class="metric">${reliability}</td>
    <td class="metric">${esc(cellValue(row.judgedQuality ?? { kind: 'missing' }))}<small>${esc(
    tier
  )} · ${row.coverage.covered}/${row.coverage.total} columns</small></td>
  </tr>`;
};

/**
 * Separate artifact. It deliberately does not replace matrix.html: reliability
 * is currently measured for only a subset of models, and absence must remain
 * visibly "Unmeasured" rather than silently ranking as 0.
 */
export const renderReliabilityHtml = (
  matrix: Matrix,
  traces: MatrixTraceData = {},
  provenance: MatrixProvenance = {}
): string => {
  const cells = reliabilityCellsFromTraces(traces);
  const rows = [...matrix.proprietary, ...matrix.openSource];
  const measuredRows = rows.filter(
    (row) => rowAgreement(cells, row.modelId).status === 'measured'
  ).length;
  const generated = new Date().toISOString();
  const prov = [
    `Generated ${generated}`,
    provenance.branch ? `branch ${provenance.branch}` : undefined,
    provenance.commitSha ? `commit ${provenance.commitSha}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Matrix reliability view</title><style>
:root{--bg:#0f1115;--panel:#171a21;--panel2:#1f2430;--border:#2a3140;--text:#e6e9ef;--muted:#9aa4b2;--accent:#6ea8fe;--ok:#5fd0a0;--warn:#ffd166}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{max-width:1100px;margin:0 auto;padding:38px 22px 70px}h1{margin:0 0 4px;font-size:26px}.sub{color:var(--muted);font-size:13px;margin:0 0 24px}.callout{border-left:4px solid var(--warn);background:rgba(255,209,102,.08);padding:14px 18px;margin:18px 0 24px;border-radius:0 8px 8px 0}.callout strong{color:var(--warn)}table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--border)}th,td{padding:11px 14px;border-bottom:1px solid var(--border);vertical-align:top}th{background:var(--panel2);color:var(--muted);text-transform:uppercase;font-size:11px;letter-spacing:.05em;text-align:left}.model{font-weight:650;min-width:230px}.model small,.metric small{display:block;color:var(--muted);font-weight:400;font-size:11px}.metric{min-width:170px}.unmeasured{color:var(--muted);font-style:italic}.legend{color:var(--muted);font-size:12px;margin-top:14px}code{font-family:ui-monospace,monospace;background:var(--panel2);padding:2px 5px;border-radius:4px}
</style></head><body><div class="wrap"><h1>Capability · Reliability · Judged quality</h1><p class="sub">${esc(
    prov
  )}</p>
<div class="callout"><strong>${measuredRows}/${
    rows.length
  } models have repeated cells.</strong> Reliability is blank by design for the rest. A single run is neither stable nor unstable.</div>
<table><thead><tr><th>Model</th><th>Capability</th><th>Reliability</th><th>Judged quality</th></tr></thead><tbody>${rows
    .map((row) => rowHtml(row, cells))
    .join('\n')}</tbody></table>
<p class="legend"><b>Capability</b> is the mean of deterministic contract evaluators (<code>ExpectedToolCalled</code>, <code>FinalAnswerPresent</code>, <code>MinExpectedSteps</code>, and <code>SkillInvoked</code>). <b>Reliability</b> is pairwise exact agreement of ordered <code>tool_id</code> sequences; provider-generated <code>tool_call_id</code> is never compared. <b>Judged quality</b> is the mean of the remaining maximize-direction evaluators. The three axes are never averaged into a rank.</p>
</div></body></html>`;
};
