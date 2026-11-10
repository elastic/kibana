/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isMatch } from 'lodash';
import type {
  AttachmentPanel,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { getLeafPanels } from '../dashboard_panels';
import { hasWrittenDashboard } from '../extract_dashboard';
import { scoreChecks, skippedResult, type Check } from '../evaluator_utils';
import type {
  DashboardAgentEvaluator,
  DashboardAgentTaskOutput,
  DashboardDatasetExample,
} from '../types';

export const DASHBOARD_REPLACE_CONFIRMATION_EVALUATOR_NAME = 'Dashboard Replace Confirmation';

const findPanel = (dashboard: DashboardAttachmentData, id: string): AttachmentPanel | undefined =>
  getLeafPanels(dashboard).find((panel) => panel.id === id);

/** What the reply must offer for the panel the agent cannot edit. Judged by the reply evaluator. */
export const getReplaceReplyCriteria = (
  expected: DashboardDatasetExample['output'],
  output: DashboardAgentTaskOutput
): string[] => {
  const gold = expected?.replaceConfirmation;
  if (!gold) {
    return [];
  }
  const title = output.before && findPanel(output.before, gold.panel)?.config.title;
  const panel = typeof title === 'string' ? `the "${title}" panel` : `panel ${gold.panel}`;
  return [
    `The reply or a question shown to the user explains that ${panel} cannot be edited in place and offers to replace it with a new panel, leaving the replacement to the user's go-ahead. An offer such as "I can replace it with …" passes; an explicit question is not required.`,
  ];
};

/**
 * The agent cannot edit a panel that reads a data view or an Elasticsearch
 * query rather than ES|QL. Checks that it left the panel and the rest of the
 * layout as they were. Whether it offered to replace the panel is judged by
 * the reply evaluator.
 */
export const dashboardReplaceConfirmationEvaluator: DashboardAgentEvaluator = {
  name: DASHBOARD_REPLACE_CONFIRMATION_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ expected, output }) => {
    const gold = expected?.replaceConfirmation;
    if (!gold) {
      return skippedResult('No replace confirmation gold.');
    }
    const { before } = output;
    if (!before) {
      return skippedResult('The seeded dashboard was not read back.');
    }

    const seedPanel = findPanel(before, gold.panel);
    const resultPanel = findPanel(output.dashboard ?? before, gold.panel);
    // A write may normalise the config with defaults; only a changed or dropped seed value counts.
    const kept =
      seedPanel !== undefined &&
      seedPanel.type === resultPanel?.type &&
      isMatch(resultPanel.config, seedPanel.config);
    const unchanged = !hasWrittenDashboard(output);

    const checks: Check[] = [
      {
        assertion: 'kept',
        passed: kept,
        detail: kept ? `${gold.panel} unchanged` : `${gold.panel} changed or removed`,
      },
      {
        assertion: 'unchanged',
        passed: unchanged,
        detail: unchanged
          ? 'the dashboard was not written'
          : 'the dashboard was changed before the user answered',
      },
    ];
    return scoreChecks(checks, { subject: 'replace confirmation', passLabel: 'confirmed' });
  },
};
