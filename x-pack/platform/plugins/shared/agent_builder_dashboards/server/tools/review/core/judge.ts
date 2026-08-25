/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ModelProvider } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { getErrorMessage } from '../../generate/core';
import type { PanelFacts } from './panel_facts';
import {
  buildSinglePassJudgePrompt,
  buildPanelBatchPrompt,
  buildHolisticAuditPrompt,
  buildVisualAuditPrompt,
} from './judge_prompts';

/**
 * Review scope. "recent_changes" is the high-precision self-review the agent
 * runs after generating content; "full_audit" is the exhaustive audit used
 * when improving an existing (typically user-authored) dashboard.
 */
export type ReviewScope = 'recent_changes' | 'full_audit';

/** Maximum findings for the single-pass "recent_changes" review. */
const RECENT_CHANGES_MAX_FINDINGS = 10;

/** Maximum findings returned by a "full_audit" review after merging. */
const FULL_AUDIT_MAX_FINDINGS = 25;

/** Maximum findings a single audit batch/holistic call may return. */
const AUDIT_PASS_MAX_FINDINGS = 10;

/** Panels per parallel batch call in the full-audit fan-out. */
const PANEL_BATCH_SIZE = 5;

/** Maximum panel ids a single finding may reference. */
const MAX_FINDING_PANEL_IDS = 50;

export interface ReviewFinding {
  scope: 'panel' | 'dashboard';
  panel_ids?: string[];
  severity: 'critical' | 'warning' | 'suggestion';
  issue: string;
  suggestion: string;
}

export interface JudgeResult {
  overall_assessment: string;
  findings: ReviewFinding[];
  /** Panels whose audit batch failed — their per-panel checks did not run. */
  unreviewed_panel_ids?: string[];
}

/**
 * Finding categories are internal: they key the cross-pass dedup in the
 * full-audit merge and are stripped from the returned findings.
 */
const findingCategorySchema = z.enum([
  'data',
  'chart_type',
  'title',
  'format',
  'color',
  'layout',
  'composition',
  'redundancy',
  'consistency',
  'controls',
  'sections',
  'metadata',
  'other',
]);

const findingSchema = z.object({
  scope: z.enum(['panel', 'dashboard']),
  panel_ids: z.array(z.string().max(256)).max(MAX_FINDING_PANEL_IDS).optional(),
  category: findingCategorySchema
    .describe('The kind of defect this finding describes.')
    .default('other'),
  severity: z.enum(['critical', 'warning', 'suggestion']),
  issue: z.string(),
  suggestion: z.string(),
});

type InternalFinding = z.infer<typeof findingSchema>;

const judgeOutputSchema = z.object({
  overall_assessment: z.string(),
  // Models routinely omit the array when there are zero findings — default it.
  findings: z.array(findingSchema).max(RECENT_CHANGES_MAX_FINDINGS).default([]),
});

const auditPassOutputSchema = z.object({
  findings: z.array(findingSchema).max(AUDIT_PASS_MAX_FINDINGS).default([]),
});

const holisticAuditOutputSchema = z.object({
  overall_assessment: z.string(),
  findings: z.array(findingSchema).max(AUDIT_PASS_MAX_FINDINGS).default([]),
});

const visualAuditOutputSchema = z.object({
  overall_assessment: z.string(),
  findings: z.array(findingSchema).max(FULL_AUDIT_MAX_FINDINGS).default([]),
});

const toReviewFinding = ({ category, ...finding }: InternalFinding): ReviewFinding => finding;

const SEVERITY_RANK: Record<ReviewFinding['severity'], number> = {
  critical: 0,
  warning: 1,
  suggestion: 2,
};

const findingDedupKey = (finding: InternalFinding): string => {
  const panels =
    finding.scope === 'panel' && finding.panel_ids?.length
      ? [...finding.panel_ids].sort().join(',')
      : 'dashboard';
  return `${finding.category}|${panels}`;
};

/**
 * Merge fan-out pass results: per-panel batch findings win over holistic ones
 * with the same category and panel set, and the result is severity-ordered and
 * capped.
 */
const mergeAuditFindings = (
  batchFindings: InternalFinding[],
  holisticFindings: InternalFinding[]
): ReviewFinding[] => {
  const seen = new Set<string>();
  const merged: InternalFinding[] = [];

  for (const finding of [...batchFindings, ...holisticFindings]) {
    const key = findingDedupKey(finding);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(finding);
  }

  return merged
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, FULL_AUDIT_MAX_FINDINGS)
    .map(toReviewFinding);
};

const chunkPanels = (panelFacts: PanelFacts[]): PanelFacts[][] => {
  const chunks: PanelFacts[][] = [];
  for (let i = 0; i < panelFacts.length; i += PANEL_BATCH_SIZE) {
    chunks.push(panelFacts.slice(i, i + PANEL_BATCH_SIZE));
  }
  return chunks;
};

interface JudgeContext {
  dashboardData: DashboardAttachmentData;
  panelFacts: PanelFacts[];
  focus: string | undefined;
  /** Rendered dashboard screenshot (data URL) — the judge reviews pixels instead of data facts. */
  imageDataUrl?: string;
  modelProvider: ModelProvider;
  logger: Logger;
}

const invokeStructured = async <T extends z.ZodTypeAny>(
  modelProvider: ModelProvider,
  schema: T,
  prompt: string,
  imageDataUrl?: string
): Promise<z.infer<T>> => {
  const defaultModel = await modelProvider.getDefaultModel();
  const model = defaultModel.chatModel.withStructuredOutput(schema, {
    name: 'review_dashboard',
  });
  const content = imageDataUrl
    ? [
        { type: 'text' as const, text: prompt },
        { type: 'image_url' as const, image_url: { url: imageDataUrl } },
      ]
    : prompt;
  const rawResult = await model.invoke([{ role: 'user', content }]);
  // withStructuredOutput only uses the schema for the tool definition and returns
  // the model's arguments unvalidated — enforce the schema (and its defaults) here.
  return schema.parse(rawResult);
};

const judgeSinglePass = async ({
  dashboardData,
  panelFacts,
  focus,
  imageDataUrl,
  modelProvider,
  logger,
}: JudgeContext): Promise<JudgeResult> => {
  const prompt = buildSinglePassJudgePrompt(
    dashboardData,
    panelFacts,
    focus,
    RECENT_CHANGES_MAX_FINDINGS,
    imageDataUrl !== undefined
  );

  logger.debug(`Invoking dashboard judge for "${dashboardData.title}"`);
  const result = await invokeStructured(modelProvider, judgeOutputSchema, prompt, imageDataUrl);

  return {
    overall_assessment: result.overall_assessment,
    findings: result.findings.map(toReviewFinding),
  };
};

/**
 * Full-audit fan-out: parallel per-panel batches (isolated config/data checks)
 * plus one holistic pass over compact digests (cross-panel and dashboard-level
 * checks), merged and deduped in code. Failed batches degrade gracefully and
 * are reported via `unreviewed_panel_ids`.
 */
/**
 * Screenshot-based full audit: a single call judging per-panel and cross-panel
 * checks together from the rendered image — the whole dashboard is one visual
 * context, so fanning out into batches would only resend the same screenshot.
 */
const judgeVisualAudit = async ({
  dashboardData,
  panelFacts,
  focus,
  imageDataUrl,
  modelProvider,
  logger,
}: JudgeContext): Promise<JudgeResult> => {
  logger.debug(
    `Invoking visual full-audit dashboard judge for "${dashboardData.title}" (single pass with screenshot)`
  );

  const result = await invokeStructured(
    modelProvider,
    visualAuditOutputSchema,
    buildVisualAuditPrompt(dashboardData, panelFacts, focus, FULL_AUDIT_MAX_FINDINGS),
    imageDataUrl
  );

  return {
    overall_assessment: result.overall_assessment,
    findings: mergeAuditFindings(result.findings, []),
  };
};

const judgeFullAudit = async ({
  dashboardData,
  panelFacts,
  focus,
  modelProvider,
  logger,
}: JudgeContext): Promise<JudgeResult> => {
  const batches = chunkPanels(panelFacts);
  logger.debug(
    `Invoking full-audit dashboard judge for "${dashboardData.title}" (${batches.length} panel batches + 1 holistic pass)`
  );

  const holisticPromise = invokeStructured(
    modelProvider,
    holisticAuditOutputSchema,
    buildHolisticAuditPrompt(dashboardData, panelFacts, focus, AUDIT_PASS_MAX_FINDINGS)
  );
  const batchPromises = batches.map((batch) =>
    invokeStructured(
      modelProvider,
      auditPassOutputSchema,
      buildPanelBatchPrompt(batch, AUDIT_PASS_MAX_FINDINGS)
    )
  );

  const [holisticSettled, ...batchesSettled] = await Promise.allSettled([
    holisticPromise,
    ...batchPromises,
  ]);

  const batchFindings: InternalFinding[] = [];
  const unreviewedPanelIds: string[] = [];
  batchesSettled.forEach((settled, index) => {
    if (settled.status === 'fulfilled') {
      batchFindings.push(...settled.value.findings);
      return;
    }
    const panelIds = batches[index].map((panel) => panel.panel_id);
    unreviewedPanelIds.push(...panelIds);
    logger.warn(
      `Audit batch for panels [${panelIds.join(', ')}] failed: ${getErrorMessage(settled.reason)}`
    );
  });

  let holisticFindings: InternalFinding[] = [];
  let overallAssessment: string;
  if (holisticSettled.status === 'fulfilled') {
    holisticFindings = holisticSettled.value.findings;
    overallAssessment = holisticSettled.value.overall_assessment;
  } else {
    if (batchesSettled.every((settled) => settled.status === 'rejected')) {
      throw holisticSettled.reason;
    }
    logger.warn(`Holistic audit pass failed: ${getErrorMessage(holisticSettled.reason)}`);
    overallAssessment =
      'The holistic review pass failed — the findings below cover per-panel checks only; cross-panel consistency, layout, and composition were not reviewed.';
  }

  return {
    overall_assessment: overallAssessment,
    findings: mergeAuditFindings(batchFindings, holisticFindings),
    ...(unreviewedPanelIds.length > 0 ? { unreviewed_panel_ids: unreviewedPanelIds } : {}),
  };
};

/**
 * Call the default model to judge the dashboard and return structured findings.
 * "recent_changes" runs a single high-precision pass; "full_audit" fans out into
 * per-panel batches plus a holistic pass and merges the results.
 */
export const judgeDashboard = async ({
  scope = 'recent_changes',
  ...context
}: JudgeContext & { scope?: ReviewScope }): Promise<JudgeResult> => {
  // With a screenshot the whole dashboard is one visual context, so a
  // full_audit runs as a single visual pass instead of the batch fan-out.
  const result =
    scope === 'full_audit'
      ? context.imageDataUrl !== undefined
        ? await judgeVisualAudit(context)
        : await judgeFullAudit(context)
      : await judgeSinglePass(context);

  context.logger.info(
    `Dashboard judge (${scope}) returned ${result.findings.length} finding(s) for "${context.dashboardData.title}"`
  );

  return result;
};
