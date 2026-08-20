/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Matrix, MatrixRow, MatrixDisplayColumn } from './build_matrix';
import type { MatrixConfig } from './load_matrix_config';
import type { MatrixProvenance } from './render_matrix';
import type { MatrixTraceData, TraceStep } from './trace_types';
import { traceKey } from './trace_types';

/** CSS copied from the reference agent_eval_smoke.html report. */
const REPORT_CSS = `
  :root {
    --bg:#0f1115; --panel:#171a21; --panel2:#1f2430; --border:#2a3140;
    --text:#e6e9ef; --muted:#9aa4b2; --accent:#6ea8fe;
    --ok:#5fd0a0; --err:#ff5d6c; --warn:#ffd166;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text);
    font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  .wrap { max-width:1120px; margin:0 auto; padding:32px 20px 64px; }
  h1 { font-size:24px; margin:0 0 4px; }
  .sub { color:var(--muted); margin:0 0 24px; font-size:13px; }
  a { color:var(--accent); }
  table { width:100%; border-collapse:collapse; background:var(--panel);
    border:1px solid var(--border); border-radius:10px; overflow:hidden; margin-bottom:14px; }
  th,td { padding:10px 13px; text-align:left; border-bottom:1px solid var(--border);
    vertical-align:top; }
  th { background:var(--panel2); color:var(--muted); font-size:12px;
    text-transform:uppercase; letter-spacing:.04em; }
  tr:last-child td { border-bottom:none; }
  td.num { text-align:center; color:var(--muted); }
  td.model { font-weight:600; min-width:160px; }
  .model-id { color:var(--muted); font-weight:400; font-size:12px; font-family:ui-monospace,monospace; }
  td.cell { font-size:13px; }
  td.cell.ok { color:var(--text); }
  td.cell.err { color:var(--err); font-weight:600; }
  .ok-dot { color:var(--ok); font-weight:700; }
  .sub-num { color:var(--muted); font-size:11px; }
  .legend { color:var(--muted); font-size:12px; margin:4px 0 30px; }
  .status { padding:2px 9px; border-radius:20px; font-size:12px; font-weight:600; flex:none; }
  .status.ok { background:rgba(95,208,160,.15); color:var(--ok); }
  .status.err { background:rgba(255,93,108,.15); color:var(--err); }
  .card { background:var(--panel); border:1px solid var(--border);
    border-radius:12px; padding:18px 20px; margin-bottom:22px; }
  .card-head { display:flex; align-items:baseline; justify-content:space-between;
    gap:12px; flex-wrap:wrap; margin-bottom:6px; }
  .card-head h2 { font-size:18px; margin:0; }
  .meta { color:var(--muted); font-size:13px; display:flex; gap:8px; flex-wrap:wrap; }
  details.prompt { border:1px solid var(--border); border-radius:9px;
    margin-top:10px; background:var(--panel2); }
  details.prompt > summary { list-style:none; cursor:pointer; padding:11px 14px;
    display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  details.prompt > summary::-webkit-details-marker { display:none; }
  .prompt-id { font-weight:600; font-family:ui-monospace,monospace; font-size:13px; }
  .skill-chip { font-size:11px; background:rgba(110,168,254,.14); color:var(--accent);
    border:1px solid rgba(110,168,254,.25); padding:2px 9px; border-radius:20px; flex:none; }
  .p-meta { color:var(--muted); font-size:12px; margin-left:auto; flex:none; }
  .prompt-body { padding:4px 16px 16px; border-top:1px solid var(--border); }
  .tool-trail { font-size:12px; color:var(--muted); margin:10px 0; }
  .tool-trail code { white-space:normal; }
  .question { background:rgba(110,168,254,.08); padding:10px 14px; border-radius:8px;
    margin:8px 0; border-left:3px solid var(--accent); }
  .question::before { content:"💬 Initial User Question: "; font-weight:600; color:var(--accent); }
  .answer { background:var(--panel); border:1px solid var(--border); border-radius:8px;
    padding:4px 16px; margin:8px 0; }
  .answer h3 { font-size:17px; } .answer h4 { font-size:15px; } .answer h5,.answer h6 { font-size:13px; }
  .answer table.md { margin:10px 0; font-size:13px; }
  .answer table.md th { text-transform:none; letter-spacing:0; }
  .answer table.md td, .answer table.md th { border:1px solid var(--border); padding:4px 8px; text-align:left; }
  .answer table.md th { background:var(--panel2); }
  .answer table.md tbody tr:nth-child(odd) { background:rgba(255,255,255,0.02); }
  .answer blockquote { margin:8px 0; padding:2px 12px; border-left:3px solid var(--accent); color:var(--muted, #9aa4b2); }
  .answer pre { background:#0b0d12; border:1px solid var(--border); border-radius:7px;
    padding:11px 13px; overflow:auto; }
  .answer pre code { background:none; padding:0; color:#cdd3dd; }
  .answer hr { border:none; border-top:1px solid var(--border); margin:14px 0; }
  details.trace { margin:8px 0 4px; }
  details.trace summary { cursor:pointer; color:var(--muted); font-size:13px; padding:6px 0; }
  .trace-body { border-left:2px solid var(--border); padding-left:12px; margin:6px 0 6px 4px; }
  .step { font-size:12.5px; margin:5px 0; display:flex; gap:8px; align-items:baseline; }
  .step-tag { flex:none; font-size:10px; text-transform:uppercase; letter-spacing:.05em;
    color:var(--muted); width:16px; }
  .step.reasoning { color:#bcc4d2; }
  .step.tool { color:var(--text); }
  .tool-tag { width:18px; height:18px; border-radius:50%; background:var(--border);
    color:var(--text); display:inline-grid; place-items:center; font-size:10px; font-weight:700; }
  .tool-id { color:#ffd9a8; }
  .tool-params { color:var(--muted); font-family:ui-monospace,monospace; font-size:11.5px; }
  code { background:rgba(255,255,255,.07); padding:1px 5px; border-radius:5px;
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:13px; color:#ffd9a8; }
  .empty { color:var(--muted); font-style:italic; padding:8px 0; }
`;

/** Escape HTML special characters. */
const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

/** Convert inline markdown (bold, code, links) to HTML. Input must be HTML-escaped already. */
const inlineMd = (s: string): string =>
  s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text: string, url: string) =>
      // Only allow http(s) links — the markdown source is untrusted model
      // output, and escaped schemes like `javascript:` still execute.
      /^https?:\/\//i.test(url) ? `<a href="${url}">${text}</a>` : text
    );

const splitTableRow = (line: string): string[] =>
  line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

/**
 * Minimal markdown → HTML (headings, lists, bold, code, hr, blockquotes,
 * pipe tables). Input is untrusted model output: every text run is
 * HTML-escaped before inline markdown is applied, and tables are only
 * recognized when EVERY row cell is well-formed (never mid-list).
 */
const mdToHtml = (md: string): string => {
  const lines = md.split('\n');
  const out: string[] = [];
  let inUl = false;
  let inOl = false;
  const closeList = () => {
    if (inUl) {
      out.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      out.push('</ol>');
      inOl = false;
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Fenced code block: ``` ... ``` — content must stay verbatim (ES|QL
    // queries legitimately contain pipes; treating those as tables mangles
    // them). esc() inside <pre><code> keeps untrusted content inert.
    if (line.trim().startsWith('```')) {
      closeList();
      const code: string[] = [];
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().startsWith('```')) {
        code.push(lines[j]);
        j++;
      }
      out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
      i = j; // skip the closing fence (or EOF)
      continue;
    }
    if (line.startsWith('### ')) {
      closeList();
      out.push(`<h6>${esc(line.slice(4))}</h6>`);
      continue;
    }
    if (line.startsWith('## ')) {
      closeList();
      out.push(`<h5>${esc(line.slice(3))}</h5>`);
      continue;
    }
    if (line.startsWith('# ')) {
      closeList();
      out.push(`<h4>${esc(line.slice(2))}</h4>`);
      continue;
    }
    if (line.startsWith('---')) {
      closeList();
      out.push('<hr>');
      continue;
    }
    // Pipe table: header row, then a |---|---| separator, then body rows.
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      /^\|?[\s:-]*-{2,}[\s|:-]*\|/.test(lines[i + 1]) &&
      lines[i + 1].includes('-')
    ) {
      closeList();
      const header = splitTableRow(line);
      let j = i + 2;
      const body: string[][] = [];
      while (j < lines.length && lines[j].includes('|') && lines[j].trim() !== '') {
        body.push(splitTableRow(lines[j]));
        j++;
      }
      out.push('<table class="md"><thead><tr>');
      for (const cell of header) {
        out.push(`<th>${inlineMd(esc(cell))}</th>`);
      }
      out.push('</tr></thead><tbody>');
      for (const row of body) {
        out.push('<tr>');
        for (const cell of row) {
          out.push(`<td>${inlineMd(esc(cell))}</td>`);
        }
        out.push('</tr>');
      }
      out.push('</tbody></table>');
      i = j - 1;
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      if (!inOl) {
        closeList();
        inOl = true;
      }
      out.push(`<li>${inlineMd(esc(line.replace(/^\d+\.\s/, '')))}</li>`);
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inUl) {
        closeList();
        inUl = true;
      }
      out.push(`<li>${inlineMd(esc(line.slice(2)))}</li>`);
      continue;
    }
    if (line.startsWith('> ')) {
      closeList();
      out.push(`<blockquote><p>${inlineMd(esc(line.slice(2)))}</p></blockquote>`);
      continue;
    }
    if (line.trim() === '') {
      closeList();
      continue;
    }
    closeList();
    out.push(`<p>${inlineMd(esc(line))}</p>`);
  }
  closeList();
  return out.join('\n');
};

const cellHtml = (row: MatrixRow, column: MatrixDisplayColumn): string => {
  const cell =
    column.kind === 'overall' ? row.overall : row.cells[column.id] ?? { kind: 'missing' };
  switch (cell.kind) {
    case 'score':
      return `<span class="ok-dot">✓</span> ${cell.value}`;
    case 'not-recommended':
      return `<span class="status err">⛔ fail</span>`;
    case 'missing':
    default:
      return '<span class="sub-num">—</span>';
  }
};

const stepHtml = (step: TraceStep, index: number): string => {
  if (step.type === 'tool') {
    return `<div class="step tool"><span class="step-tag tool-tag">${index}</span><code class="tool-id">${esc(
      step.toolId ?? ''
    )}</code><span class="tool-params">${esc(step.toolParams ?? '')}</span></div>`;
  }
  if (step.type === 'skill') {
    return `<div class="step reasoning"><span class="step-tag">skill</span>Selected: ${esc(
      (step.skills ?? []).join(', ')
    )}</div>`;
  }
  return `<div class="step reasoning"><span class="step-tag">think</span>${esc(
    step.text ?? ''
  )}</div>`;
};

const renderSummaryTable = (matrix: Matrix, config: MatrixConfig): string => {
  const groupedColumns = matrix.displayColumns.map((col) => {
    const source = col.kind === 'overall' ? undefined : config.columns.find((c) => c.id === col.id);
    return { ...col, group: source?.group };
  });
  const hasGroups = groupedColumns.some((col) => col.group);

  const groupHeader = hasGroups
    ? `<tr><th></th>${(() => {
        let html = '';
        let i = 0;
        while (i < groupedColumns.length) {
          const group = groupedColumns[i].group;
          let span = 1;
          while (i + span < groupedColumns.length && groupedColumns[i + span].group === group) {
            span += 1;
          }
          html += group
            ? `<th colspan="${span}">${esc(group)}</th>`
            : `<th colspan="${span}"></th>`;
          i += span;
        }
        return html;
      })()}</tr>`
    : '';

  const header = `${groupHeader}<tr><th>Model</th>${matrix.displayColumns
    .map((c) => `<th>${esc(c.label)}</th>`)
    .join('')}</tr>`;
  const rows = [...matrix.proprietary, ...matrix.openSource]
    .map(
      (row) =>
        `<tr><td class="model">${esc(row.modelLabel)}<br><span class="model-id">${esc(
          row.modelId
        )}</span></td>${matrix.displayColumns
          .map((col) => `<td class="cell ok">${cellHtml(row, col)}</td>`)
          .join('')}</tr>`
    )
    .join('');
  return `<table><thead>${header}</thead><tbody>${rows}</tbody></table>`;
};

const renderModelCard = (
  rows: MatrixRow[],
  matrix: Matrix,
  config: MatrixConfig,
  traces?: MatrixTraceData
): string => {
  return rows
    .map((row) => {
      const completed = matrix.displayColumns.filter((col) => {
        const cell = col.kind === 'overall' ? row.overall : row.cells[col.id];
        return cell && cell.kind === 'score';
      }).length;
      const total = matrix.displayColumns.length;

      const prompts = matrix.displayColumns
        .map((col) => {
          const cell =
            col.kind === 'overall' ? row.overall : row.cells[col.id] ?? { kind: 'missing' };
          const status =
            cell.kind === 'score'
              ? '<span class="status ok">completed</span>'
              : cell.kind === 'not-recommended'
              ? '<span class="status err">failed</span>'
              : '<span class="status err">missing</span>';

          const column = config.columns.find((c) => c.id === col.id);
          const trace =
            traces?.[traceKey(row.modelId, col.id)] ??
            // examplePrefixes columns consume synthetic `prefix:<p>` datasets;
            // resolve the trace for that prefix's own example.
            column?.examplePrefixes
              ?.map((p) => traces?.[traceKey(row.modelId, `prefix:${p}`)])
              .find((t) => t != null) ??
            // Column IDs (e.g. 'alert_triage') don't match suite IDs (e.g.
            // 'security-alert-triage'). Fall back to the current column's
            // configured suite IDs to find the first matching trace.
            column?.suites.map((s) => traces?.[traceKey(row.modelId, s)]).find((t) => t != null);
          const scoreStr = cell.kind === 'score' ? `score ${cell.value}` : '';
          const metaParts = [
            scoreStr,
            trace?.stepCount ? `${trace.stepCount} steps` : '',
            trace?.toolCount ? `${trace.toolCount} tools` : '',
          ].filter(Boolean);

          let body = '';
          if (trace?.question) {
            body += `<div class="question">${esc(trace.question)}</div>`;
          }
          if (trace?.toolTrail?.length) {
            body += `<p class="tool-trail"><strong>Tools called:</strong> <code>${esc(
              trace.toolTrail.join(', ')
            )}</code></p>`;
          }
          if (trace?.answer) {
            body += `<div class="answer">${mdToHtml(trace.answer)}</div>`;
          } else if (trace) {
            body +=
              '<div class="answer"><p class="empty">No final answer message captured.</p></div>';
          } else {
            body += '<p class="empty">Trace unavailable.</p>';
          }
          if (trace?.steps?.length) {
            const stepsHtml = trace.steps.map((s, i) => stepHtml(s, i + 1)).join('\n');
            body += `<details class="trace"><summary>🔍 Step trace — ${trace.steps.length} steps</summary><div class="trace-body">${stepsHtml}</div></details>`;
          }

          return `<details class="prompt"><summary>${status}<span class="prompt-id">${esc(
            col.label
          )}</span><span class="skill-chip">${esc(col.id)}</span><span class="p-meta">${esc(
            metaParts.join(' · ')
          )}</span></summary><div class="prompt-body">${body}</div></details>`;
        })
        .join('\n');

      return `<section class="card"><header class="card-head"><h2>${esc(
        row.modelLabel
      )}</h2><div class="meta"><span class="model-id">${esc(
        row.modelId
      )}</span><span>·</span><span>${completed}/${total} completed</span></div></header>${prompts}</section>`;
    })
    .join('\n');
};

/**
 * Renders a self-contained HTML report from the matrix data, matching the
 * `agent_eval_smoke.html` reference format. When `traces` is provided, each
 * prompt section includes the initial user question, tool trail, agent answer,
 * and step trace.
 */
export const renderMatrixHtml = (
  matrix: Matrix,
  config: MatrixConfig,
  provenance: MatrixProvenance = {},
  traces?: MatrixTraceData
): string => {
  const generatedAt = new Date().toISOString();
  const provenanceLine = [
    `Generated ${generatedAt}`,
    provenance.branch ? `branch \`${provenance.branch}\`` : undefined,
    provenance.lookbackDays !== undefined ? `${provenance.lookbackDays}-day lookback` : undefined,
    provenance.commitSha ? `commit \`${provenance.commitSha}\`` : undefined,
    provenance.buildUrl ? `<a href="${esc(provenance.buildUrl)}">build</a>` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  const summaryTable = renderSummaryTable(matrix, config);
  const modelCards =
    (matrix.proprietary.length > 0
      ? renderModelCard(matrix.proprietary, matrix, config, traces)
      : '') +
    (matrix.openSource.length > 0
      ? renderModelCard(matrix.openSource, matrix, config, traces)
      : '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(config.title)}</title>
<style>${REPORT_CSS}</style>
</head>
<body>
<div class="wrap">
<h1>${esc(config.title)}</h1>
<p class="sub">${provenanceLine}</p>
${summaryTable}
<p class="legend">Each cell shows the model's score (0–10). Expand a prompt below to read the agent's full answer, tool trail, and reasoning trace.</p>
${modelCards}
</div>
</body>
</html>`;
};
