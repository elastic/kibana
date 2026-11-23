/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { GENERATE_DASHBOARD_TOOL_ID } from '../extract_dashboard';
import { SECTIONED_LOGS_DASHBOARD } from '../fixtures/sectioned_logs_dashboard';
import type { SettingsGold } from '../types';
import { dashboardSettingsEvaluator } from './dashboard_settings';

const WRITE_STEP = {
  type: 'tool_call',
  tool_id: GENERATE_DASHBOARD_TOOL_ID,
  results: [{ type: 'dashboard', data: { attachment_id: 'seed' } }],
};

const RENAMED = 'Renamed';

/** The seed with a new title, so the run counts as a write, plus the given fields. */
const written = (
  fields: Partial<DashboardAttachmentData> = {},
  seed = SECTIONED_LOGS_DASHBOARD
): DashboardAttachmentData => ({ ...seed, title: RENAMED, ...fields });

const evaluateSettings = (
  settings: SettingsGold | undefined,
  dashboard: DashboardAttachmentData,
  {
    before = SECTIONED_LOGS_DASHBOARD,
    steps = [WRITE_STEP],
  }: { before?: DashboardAttachmentData; steps?: Array<Record<string, unknown>> } = {}
) =>
  dashboardSettingsEvaluator.evaluate({
    input: { question: 'q' },
    expected: settings ? { settings } : {},
    metadata: undefined,
    output: { errors: [], messages: [], steps, before, dashboard },
  });

describe('dashboard settings evaluator', () => {
  const hideBorders: SettingsGold = { options: { hide_panel_borders: true } };

  it('skips without gold and scores 0 when the agent never wrote the dashboard', async () => {
    expect((await evaluateSettings(undefined, written())).score).toBeNull();
    expect(
      (await evaluateSettings(hideBorders, SECTIONED_LOGS_DASHBOARD, { steps: [] })).score
    ).toBe(0);
  });

  it('passes the requested setting with every other setting kept', async () => {
    const result = await evaluateSettings(
      hideBorders,
      written({ options: { hide_panel_borders: true } })
    );

    expect(result.score).toBe(1);
  });

  it.each<[string, SettingsGold, Partial<DashboardAttachmentData>]>([
    [
      'refresh interval',
      { refreshInterval: { pause: false, value: 30000 } },
      { refresh_interval: { pause: false, value: 30000 } },
    ],
    ['fast mode', { esqlApproximation: true }, { esql_approximation: true }],
  ])('passes a requested %s', async (_, gold, fields) => {
    expect((await evaluateSettings(gold, written(fields))).score).toBe(1);
  });

  it('fails a requested setting the dashboard did not get', async () => {
    const result = await evaluateSettings(
      { refreshInterval: { pause: false, value: 30000 } },
      written({ refresh_interval: { pause: true, value: 30000 } })
    );

    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain(
      'refresh_interval: expected {"pause":false,"value":30000}, found {"pause":true,"value":30000}'
    );
  });

  it('fails a setting the prompt did not ask for', async () => {
    const result = await evaluateSettings(
      {},
      written({ options: { hide_panel_titles: true }, esql_approximation: true })
    );

    expect(result.score).toBe(0);
    expect(result.explanation).toContain(
      'other settings: changed options.hide_panel_titles to true, esql_approximation to true'
    );
  });

  it('compares unset options and fast mode by their defaults', async () => {
    const result = await evaluateSettings(
      hideBorders,
      written({
        options: { hide_panel_borders: true, use_margins: true, sync_cursor: true },
        esql_approximation: false,
      })
    );

    expect(result.score).toBe(1);
  });

  it('ignores the time range, which the default step may fill', async () => {
    const result = await evaluateSettings(
      {},
      written({ time_range: { from: 'now-24h', to: 'now' } })
    );

    expect(result.score).toBe(1);
  });
});
