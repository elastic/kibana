/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MAX_REPORT_CHARS = 3500;
const MAX_FALLBACK_ISSUES = 5;
const SIGNIFICANT_P_VALUE = 0.05;

const CONFIDENCE_LABELS = {
  significant: 'significant',
  consistent: 'consistent across models/weeks',
  within_noise: 'within noise',
};

/** Slack mrkdwn treats these three characters as control characters. */
const escapeSlack = (text) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();

const formatScore = (value) => (typeof value === 'number' ? value.toFixed(3) : 'n/a');

const formatDelta = (value) => {
  if (typeof value !== 'number') return '';
  const rounded = Math.round(value * 1000) / 1000;
  if (rounded === 0) return '±0.000';
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded).toFixed(3)}`;
};

const formatModels = (models) =>
  (Array.isArray(models) ? models : []).map((model) => `\`${escapeSlack(model)}\``).join(', ');

const buildCompareUrl = ({ kibanaUrl, baselineExecutionId, executionId }) =>
  kibanaUrl && baselineExecutionId
    ? `${kibanaUrl}/app/evals/compare?type=execution&baseline=${encodeURIComponent(
        baselineExecutionId
      )}&target=${encodeURIComponent(executionId)}`
    : undefined;

const renderScoreLines = ({ scores, kibanaUrl }) =>
  scores.models.map((model) => {
    const delta =
      model.baselineBuildNumber !== undefined && typeof model.qualityDelta === 'number'
        ? ` (${formatDelta(model.qualityDelta)} vs #${model.baselineBuildNumber})`
        : ' (no earlier weekly run)';
    const compareUrl = buildCompareUrl({ kibanaUrl, ...model });
    const compare = compareUrl ? ` · <${compareUrl}|compare>` : '';
    return `• \`${escapeSlack(model.model)}\`: *${formatScore(
      model.qualityScore
    )}*${delta}${compare}`;
  });

const formatUsd = (value) => `$${value.toFixed(2)}`;

const renderCostLine = (scores) => {
  const priced = scores.models.filter((model) => model.estimatedCost);
  if (!priced.length) return [];
  const total = priced.reduce((sum, model) => sum + model.estimatedCost.usd, 0);
  const perModel = priced
    .map((model) => `\`${escapeSlack(model.model)}\` ${formatUsd(model.estimatedCost.usd)}`)
    .join(' · ');
  return [
    '',
    `*Estimated cost:* ${formatUsd(
      total
    )} (${perModel}). The agent's own LLM calls at EIS list prices; judge calls are not included.`,
  ];
};

const renderAgentSections = (report) => {
  const lines = [];
  if (report.summary) {
    lines.push('', escapeSlack(report.summary));
  }

  const changes = (report.changes ?? []).slice(0, 5);
  if (changes.length) {
    lines.push('', '*What changed*');
    for (const change of changes) {
      const icon = change.direction === 'improved' ? ':arrow_up:' : ':arrow_down:';
      const where = [change.dataset, change.evaluator].filter(Boolean).map(escapeSlack).join(' / ');
      const confidence = CONFIDENCE_LABELS[change.confidence] ?? change.confidence ?? '';
      lines.push(
        `${icon} ${formatModels(change.models)} — ${where}: ${escapeSlack(change.detail)}${
          confidence ? ` _(${escapeSlack(confidence)})_` : ''
        }`
      );
    }
  }

  const issues = (report.persistentIssues ?? []).slice(0, 4);
  if (issues.length) {
    lines.push('', '*Keeps failing*');
    for (const issue of issues) {
      const evaluators = (issue.evaluators ?? []).length
        ? ` (${issue.evaluators.map(escapeSlack).join(', ')})`
        : '';
      lines.push(
        `• *${escapeSlack(issue.title)}* — ${escapeSlack(
          issue.dataset
        )}${evaluators}, ${formatModels(issue.models)}`,
        `   ${escapeSlack(issue.evidence)}`,
        `   _Likely cause:_ ${escapeSlack(issue.likelyCause)}`
      );
    }
  }

  const focus = (report.focus ?? []).slice(0, 3);
  if (focus.length) {
    lines.push('', '*Worth working on*');
    focus.forEach((item, index) => {
      lines.push(`${index + 1}. *${escapeSlack(item.title)}* — ${escapeSlack(item.why)}`);
    });
  }
  return lines;
};

/** Without the agent: the significant changes and the slices with the most failing scores. */
const renderFallbackSections = (scores) => {
  const qualitySlices = scores.models.flatMap((model) =>
    model.slices
      .filter((slice) => slice.direction === 'maximize')
      .map((slice) => ({ ...slice, model: model.model }))
  );
  const lines = [];

  const significant = qualitySlices.filter(
    (slice) =>
      typeof slice.pValue === 'number' &&
      slice.pValue < SIGNIFICANT_P_VALUE &&
      typeof slice.previousMean === 'number'
  );
  if (significant.length) {
    lines.push('', '*Significant changes (p < 0.05)*');
    for (const slice of significant) {
      lines.push(
        `• \`${escapeSlack(slice.model)}\` — ${escapeSlack(slice.dataset)} / ${escapeSlack(
          slice.evaluator
        )}: ${formatScore(slice.previousMean)} → ${formatScore(slice.mean)}`
      );
    }
  }

  const failing = qualitySlices
    .filter((slice) => slice.failingCount > 0)
    .sort((a, b) => a.mean - b.mean || b.failingCount - a.failingCount)
    .slice(0, MAX_FALLBACK_ISSUES);
  if (failing.length) {
    lines.push('', '*Lowest scores*');
    for (const slice of failing) {
      lines.push(
        `• \`${escapeSlack(slice.model)}\` — ${escapeSlack(slice.dataset)} / ${escapeSlack(
          slice.evaluator
        )}: ${formatScore(slice.mean)} (${slice.failingCount} of ${slice.scoreCount} below 1)`
      );
    }
  }
  return lines;
};

const fitToLimit = (lines, maxChars) => {
  const text = lines.join('\n').trim();
  if (text.length <= maxChars) return text;
  const suffix = '\n_…report truncated, see the build log for the full text._';
  return `${text.slice(0, maxChars - suffix.length).replace(/\n[^\n]*$/, '')}${suffix}`;
};

/**
 * Renders the weekly score report as Slack mrkdwn: deterministic per-model quality scores, then the
 * agent's analysis, or a deterministic summary of significant changes and low scores without it.
 */
const renderSlackReport = ({
  scores,
  report,
  kibanaUrl,
  agentError,
  maxChars = MAX_REPORT_CHARS,
}) => {
  const lines = [
    `*Quality scores, weekly build #${scores.build.buildNumber}* (mean of every quality evaluator score; samples are small, so small changes are usually noise)`,
    ...renderScoreLines({ scores, kibanaUrl }),
    ...renderCostLine(scores),
  ];

  if (report) {
    lines.push(...renderAgentSections(report));
  } else {
    lines.push(...renderFallbackSections(scores));
    if (agentError) {
      lines.push(
        '',
        '_The analysis agent did not finish this week, so this is the plain summary._'
      );
    }
  }
  return fitToLimit(lines, maxChars);
};

module.exports = { renderSlackReport };
