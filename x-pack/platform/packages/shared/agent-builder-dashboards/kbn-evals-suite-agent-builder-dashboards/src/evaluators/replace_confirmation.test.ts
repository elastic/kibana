/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSection, type DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { GENERATE_DASHBOARD_TOOL_ID } from '../extract_dashboard';
import { SECTIONED_LOGS_DASHBOARD } from '../fixtures/sectioned_logs_dashboard';
import {
  dashboardReplaceConfirmationEvaluator,
  getReplaceReplyCriteria,
} from './replace_confirmation';

const PANEL = 'requests-by-extension';

const renamed = (): DashboardAttachmentData => ({
  ...SECTIONED_LOGS_DASHBOARD,
  panels: SECTIONED_LOGS_DASHBOARD.panels.map((widget) =>
    isSection(widget)
      ? {
          ...widget,
          panels: widget.panels.map((panel) =>
            panel.id === PANEL
              ? { ...panel, config: { ...panel.config, title: 'File types' } }
              : panel
          ),
        }
      : widget
  ),
});

const WRITE_STEP = {
  type: 'tool_call',
  tool_id: GENERATE_DASHBOARD_TOOL_ID,
  results: [{ type: 'dashboard', data: { attachment_id: 'seed' } }],
};

const evaluateReplace = (
  dashboard?: DashboardAttachmentData,
  steps: Array<Record<string, unknown>> = []
) =>
  dashboardReplaceConfirmationEvaluator.evaluate({
    input: { question: 'q' },
    expected: { replaceConfirmation: { panel: PANEL } },
    metadata: undefined,
    output: {
      errors: [],
      messages: [],
      steps,
      before: SECTIONED_LOGS_DASHBOARD,
      dashboard,
    },
  });

const failedAssertions = (result: Awaited<ReturnType<typeof evaluateReplace>>): string[] =>
  ((result.metadata?.checks ?? []) as Array<{ assertion: string; passed: boolean }>)
    .filter(({ passed }) => !passed)
    .map(({ assertion }) => assertion);

describe('dashboard replace confirmation evaluator', () => {
  it('skips without gold or a seeded dashboard', async () => {
    const result = await dashboardReplaceConfirmationEvaluator.evaluate({
      input: { question: 'q' },
      expected: {},
      metadata: undefined,
      output: { errors: [], messages: [] },
    });
    expect(result.score).toBeNull();
  });

  it('passes a kept panel and an unchanged layout', async () => {
    const result = await evaluateReplace();
    expect(result.score).toBe(1);
  });

  it('fails an agent that edited the panel', async () => {
    const result = await evaluateReplace(renamed());
    expect(failedAssertions(result)).toEqual(['kept']);
  });

  it('fails a write that changed the dashboard before the user answered', async () => {
    const retitled = { ...SECTIONED_LOGS_DASHBOARD, title: 'Web traffic' };
    const result = await evaluateReplace(retitled, [WRITE_STEP]);
    expect(failedAssertions(result)).toEqual(['unchanged']);
  });

  it('passes a write that left the dashboard as it was', async () => {
    const result = await evaluateReplace(structuredClone(SECTIONED_LOGS_DASHBOARD), [WRITE_STEP]);
    expect(result.score).toBe(1);
  });

  it('asks the reply judge whether the agent offered to replace the panel by its title', () => {
    const criteria = getReplaceReplyCriteria(
      { replaceConfirmation: { panel: PANEL } },
      { errors: [], messages: [], before: SECTIONED_LOGS_DASHBOARD }
    );
    expect(criteria).toEqual([expect.stringMatching(/the ".+" panel cannot be edited/)]);
    expect(getReplaceReplyCriteria({}, { errors: [], messages: [] })).toEqual([]);
  });
});
