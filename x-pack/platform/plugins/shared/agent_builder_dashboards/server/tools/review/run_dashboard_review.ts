/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider } from '@kbn/agent-builder-server';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { isSection } from '@kbn/agent-builder-dashboards-common';
import type { Logger } from '@kbn/logging';
import { createDashboardReviewPrompt, type DashboardReviewContext } from './review_prompt';
import {
  dashboardReviewOutputSchema,
  type DashboardReview,
  type DashboardReviewOutput,
} from './review_result';
import type { LoadedScreenshot } from './screenshot';

export const REVIEW_TOOL_NAME = 'report_dashboard_review';

export interface RunDashboardReviewParams {
  attachmentId: string;
  version: number;
  dashboardData: DashboardAttachmentData;
  context: DashboardReviewContext;
  screenshot?: LoadedScreenshot;
  modelProvider: ModelProvider;
  logger: Logger;
}

export interface ValidatedReview {
  review: DashboardReview;
  unreviewedPanelIds: string[];
}

/** Ids of every leaf panel (top level and inside sections), in dashboard order. */
export const listPanelIds = (data: DashboardAttachmentData): string[] =>
  data.panels.flatMap((widget) =>
    isSection(widget) ? widget.panels.map((panel) => panel.id) : [widget.id]
  );

/**
 * Validates the reviewer output against the dashboard: entries for panels or
 * sections that do not exist are dropped so the main agent never targets them,
 * and coverage is reconciled so every panel is either reviewed without
 * findings, has findings, could not be assessed, or is reported as unreviewed.
 */
export const validateReview = (
  output: DashboardReviewOutput,
  dashboardData: DashboardAttachmentData,
  logger: Logger
): ValidatedReview => {
  const panelIds = listPanelIds(dashboardData);
  const knownPanelIds = new Set(panelIds);
  const knownSectionIds = new Set(
    dashboardData.panels.filter(isSection).map((section) => section.id)
  );
  const newSectionKeys = new Set(output.new_sections.map(({ key }) => key));

  const isKnownPanel = (panelId: string, what: string): boolean => {
    const known = knownPanelIds.has(panelId);
    if (!known) {
      logger.debug(`Dropping ${what} for unknown panel "${panelId}".`);
    }
    return known;
  };

  const panelsWithFindings = new Set<string>();
  const panelFindings = output.panel_findings.filter(({ panel_id: panelId }) => {
    if (!isKnownPanel(panelId, 'panel findings') || panelsWithFindings.has(panelId)) {
      return false;
    }
    panelsWithFindings.add(panelId);
    return true;
  });

  const notAssessed = new Set<string>();
  const couldNotAssess = output.could_not_assess.filter(({ panel_id: panelId }) => {
    if (
      !isKnownPanel(panelId, 'could_not_assess entry') ||
      notAssessed.has(panelId) ||
      panelsWithFindings.has(panelId)
    ) {
      return false;
    }
    notAssessed.add(panelId);
    return true;
  });

  const reviewed = new Set(output.reviewed_panel_ids.filter((id) => knownPanelIds.has(id)));
  const isCovered = (id: string) => panelsWithFindings.has(id) || notAssessed.has(id);
  const noIssuesPanelIds = panelIds.filter((id) => reviewed.has(id) && !isCovered(id));
  const unreviewedPanelIds = panelIds.filter((id) => !reviewed.has(id) && !isCovered(id));

  const layoutChanges = output.layout_changes.filter(({ panel_id: panelId, section }) => {
    if (!isKnownPanel(panelId, 'layout change')) {
      return false;
    }
    if (section !== null && !knownSectionIds.has(section) && !newSectionKeys.has(section)) {
      logger.debug(`Dropping layout change for panel "${panelId}": unknown section "${section}".`);
      return false;
    }
    return true;
  });

  return {
    review: {
      dashboard_findings: output.dashboard_findings,
      new_sections: output.new_sections,
      layout_changes: layoutChanges,
      panel_findings: panelFindings,
      no_issues_panel_ids: noIssuesPanelIds,
      could_not_assess: couldNotAssess,
      data_questions: output.data_questions,
    },
    unreviewedPanelIds,
  };
};

/**
 * Runs one review in a fresh model context (no conversation history) and
 * validates the answer against the dashboard's real panel set.
 */
export const runDashboardReview = async ({
  attachmentId,
  version,
  dashboardData,
  context,
  screenshot,
  modelProvider,
  logger,
}: RunDashboardReviewParams): Promise<ValidatedReview> => {
  const prompt = createDashboardReviewPrompt({
    attachmentId,
    version,
    dashboardData,
    context,
    screenshot,
  });

  const { chatModel } = await modelProvider.getDefaultModel();
  const reviewer = chatModel.withStructuredOutput(dashboardReviewOutputSchema, {
    name: REVIEW_TOOL_NAME,
  });

  logger.debug(
    `Reviewing dashboard attachment "${attachmentId}" v${version} (${
      listPanelIds(dashboardData).length
    } panels, screenshot: ${screenshot ? 'yes' : 'no'})`
  );
  const output = await reviewer.invoke(prompt);

  return validateReview(output, dashboardData, logger);
};
