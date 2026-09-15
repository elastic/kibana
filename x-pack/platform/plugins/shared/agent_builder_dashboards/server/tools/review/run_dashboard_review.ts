/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy, uniqBy } from 'lodash';
import { EffortLevels } from '@kbn/agent-builder-common/model_provider';
import type { ModelProvider } from '@kbn/agent-builder-server';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { isSection } from '@kbn/agent-builder-dashboards-common';
import type { Logger } from '@kbn/logging';
import { createDashboardReviewPrompt } from './review_prompt';
import {
  dashboardReviewOutputSchema,
  type DashboardReview,
  type DashboardReviewOutput,
} from './review_result';
import type { LoadedScreenshot } from './screenshot';

export const REVIEW_TOOL_NAME = 'report_dashboard_review';

export interface RunDashboardReviewParams {
  dashboardData: DashboardAttachmentData;
  userPreferences?: string;
  screenshot?: LoadedScreenshot;
  modelProvider: ModelProvider;
  logger: Logger;
}

/** Validates panel references and identifies gaps without discarding distinct findings. */
export const validateReview = (
  output: DashboardReviewOutput,
  dashboardData: DashboardAttachmentData
): DashboardReview => {
  const panelIds = dashboardData.panels.flatMap((widget) =>
    isSection(widget) ? widget.panels.map(({ id }) => id) : [widget.id]
  );
  const knownPanelIds = new Set(panelIds);
  const panelFindings = Object.entries(
    groupBy(
      output.panel_findings.filter(({ panel_id: id }) => knownPanelIds.has(id)),
      'panel_id'
    )
  ).map(([panel_id, entries]) => ({
    panel_id,
    findings: entries.flatMap(({ findings }) => findings),
  }));
  const couldNotAssess = uniqBy(
    output.could_not_assess.filter(({ panel_id: id }) => knownPanelIds.has(id)),
    'panel_id'
  );
  const reviewedIds = new Set([
    ...output.reviewed_panel_ids,
    ...panelFindings.map(({ panel_id }) => panel_id),
  ]);
  const coveredIds = new Set([...reviewedIds, ...couldNotAssess.map(({ panel_id }) => panel_id)]);

  return {
    panel_findings: panelFindings,
    reviewed_panel_ids: panelIds.filter((id) => reviewedIds.has(id)),
    could_not_assess: couldNotAssess,
    unreviewed_panel_ids: panelIds.filter((id) => !coveredIds.has(id)),
  };
};

/** Runs one panel presentation review in a fresh model context and validates its coverage. */
export const runDashboardReview = async ({
  dashboardData,
  userPreferences,
  screenshot,
  modelProvider,
  logger,
}: RunDashboardReviewParams): Promise<DashboardReview> => {
  const prompt = createDashboardReviewPrompt({ dashboardData, userPreferences, screenshot });

  const { chatModel } = await modelProvider.getDefaultModel();
  const reviewer = chatModel.withStructuredOutput(dashboardReviewOutputSchema, {
    name: REVIEW_TOOL_NAME,
  });

  logger.debug(`Reviewing dashboard (screenshot: ${screenshot ? 'yes' : 'no'})`);
  const output = await reviewer.invoke(prompt);

  return validateReview(output, dashboardData);
};
