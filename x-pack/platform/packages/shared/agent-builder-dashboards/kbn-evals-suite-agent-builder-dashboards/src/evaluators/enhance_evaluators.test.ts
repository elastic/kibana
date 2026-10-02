/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import type {
  AttachmentPanel,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { isSection } from '@kbn/agent-builder-dashboards-common';
import type { DashboardAgentTaskOutput, EnhanceGold } from '../evaluate_dataset';
import { GENERATE_DASHBOARD_TOOL_ID } from '../extract_dashboard';
import { MESSY_LOGS_DASHBOARD } from '../fixtures/messy_logs_dashboard';
import {
  enhanceDefectResolutionEvaluator,
  enhanceModeComplianceEvaluator,
  enhanceModeQuestionEvaluator,
  enhanceNoRegressionEvaluator,
} from './enhance_evaluators';

const WRITE_STEP = {
  type: 'tool_call',
  tool_id: GENERATE_DASHBOARD_TOOL_ID,
  results: [{ type: 'dashboard', data: { attachment_id: 'seed' } }],
};

const MODE_PROMPT = {
  type: AgentPromptType.ask_user_question,
  id: 'p1',
  questions: [
    {
      question: 'How would you like to enhance this dashboard?',
      options: [{ label: 'Appearance and content' }, { label: 'Appearance only' }],
    },
  ],
};

const clone = (): DashboardAttachmentData => structuredClone(MESSY_LOGS_DASHBOARD);

const findPanel = (dashboard: DashboardAttachmentData, id: string): AttachmentPanel => {
  const found = dashboard.panels
    .flatMap((widget) => (isSection(widget) ? widget.panels : [widget]))
    .find((panel) => panel.id === id);
  if (!found) {
    throw new Error(`no panel ${id}`);
  }
  return found;
};

const output = (
  overrides: Partial<DashboardAgentTaskOutput> & { dashboard?: DashboardAttachmentData }
): DashboardAgentTaskOutput => ({
  errors: [],
  messages: [{ message: 'Done.' }],
  steps: [WRITE_STEP],
  before: MESSY_LOGS_DASHBOARD,
  dashboard: MESSY_LOGS_DASHBOARD,
  ...overrides,
});

const gold = (overrides: Partial<EnhanceGold> = {}): EnhanceGold => ({
  mode: 'appearance',
  asksMode: false,
  defects: ['placeholder_title', 'title_not_rewritten', 'xy_legend', 'area_solid_fill'],
  ...overrides,
});

const run = (
  evaluator: typeof enhanceModeQuestionEvaluator,
  enhance: EnhanceGold,
  out: DashboardAgentTaskOutput
) =>
  evaluator.evaluate({
    input: { question: 'Enhance this dashboard' },
    expected: { enhance },
    metadata: undefined,
    output: out,
  });

describe('enhance evaluators', () => {
  describe('mode question', () => {
    it('passes a bare request that asks one question offering both modes before writing', async () => {
      const result = await run(
        enhanceModeQuestionEvaluator,
        gold({ asksMode: true }),
        output({ openingPrompts: [MODE_PROMPT], openingToolIds: ['load_skill'] })
      );
      expect(result.score).toBe(1);
    });

    it('fails a bare request that never asks, and a stated mode that asks anyway', async () => {
      expect(
        (
          await run(
            enhanceModeQuestionEvaluator,
            gold({ asksMode: true }),
            output({ openingPrompts: [] })
          )
        ).score
      ).toBe(0);
      expect(
        (await run(enhanceModeQuestionEvaluator, gold(), output({ openingPrompts: [MODE_PROMPT] })))
          .score
      ).toBe(0);
    });

    it('fails when the dashboard was written before asking', async () => {
      const result = await run(
        enhanceModeQuestionEvaluator,
        gold({ asksMode: true }),
        output({ openingPrompts: [MODE_PROMPT], openingToolIds: [GENERATE_DASHBOARD_TOOL_ID] })
      );
      expect(result.label).toBe('asked-badly');
    });
  });

  describe('mode compliance', () => {
    it('abstains when the agent never wrote the dashboard', async () => {
      const result = await run(enhanceModeComplianceEvaluator, gold(), output({ steps: [] }));
      expect(result.score).toBeNull();
      expect(result.label).toBe('no-write');
    });

    it('holds appearance invariants when only titles change', async () => {
      const after = clone();
      after.title = 'Web traffic overview';
      expect(
        (await run(enhanceModeComplianceEvaluator, gold(), output({ dashboard: after }))).score
      ).toBe(1);
    });

    it('fails appearance mode when a panel is removed or a query changes', async () => {
      const removed = clone();
      removed.panels = removed.panels.filter((widget) => widget.id !== 'top-countries');
      const removedResult = await run(
        enhanceModeComplianceEvaluator,
        gold(),
        output({ dashboard: removed })
      );
      expect(removedResult.score).toBe(0);
      expect(removedResult.explanation).toContain('panel ids');

      const requeried = clone();
      findPanel(requeried, 'total-requests').config.data_source = {
        type: 'esql',
        query: 'FROM other | STATS COUNT(*)',
      };
      expect(
        (await run(enhanceModeComplianceEvaluator, gold(), output({ dashboard: requeried })))
          .explanation
      ).toContain('panel queries');
    });

    it('lets content mode drop one copy of a duplicate but not another panel', async () => {
      const dropped = clone();
      dropped.panels = dropped.panels.filter((widget) => widget.id !== 'response-breakdown');
      expect(
        (
          await run(
            enhanceModeComplianceEvaluator,
            gold({ mode: 'content' }),
            output({ dashboard: dropped })
          )
        ).score
      ).toBe(1);

      const tooMuch = clone();
      tooMuch.panels = tooMuch.panels.filter((widget) => widget.id !== 'top-countries');
      expect(
        (
          await run(
            enhanceModeComplianceEvaluator,
            gold({ mode: 'content' }),
            output({ dashboard: tooMuch })
          )
        ).score
      ).toBe(0);
    });
  });

  describe('defect resolution', () => {
    it('abstains when the seed does not show a declared defect', async () => {
      const seeded = clone();
      seeded.pinned_panels = [
        { type: 'options_list_control', id: 'c', config: { esql_query: 'FROM x | STATS BY y' } },
      ];
      const result = await run(
        enhanceDefectResolutionEvaluator,
        gold({ defects: ['no_controls'] }),
        output({ before: seeded })
      );
      expect(result.label).toBe('fixture-mismatch');
    });

    it('scores the fraction of declared defects the result no longer shows', async () => {
      const unchanged = await run(enhanceDefectResolutionEvaluator, gold(), output({}));
      expect(unchanged.score).toBe(0);

      const fixed = clone();
      fixed.title = 'Web traffic overview';
      // Every xy panel must meet the rule for the defect to count as resolved.
      for (const id of ['requests-over-time', 'requests-by-response', 'response-breakdown']) {
        findPanel(fixed, id).config.legend = { position: 'bottom', visibility: 'auto' };
      }
      const partial = await run(
        enhanceDefectResolutionEvaluator,
        gold(),
        output({ dashboard: fixed })
      );
      expect(partial.score).toBe(0.75);
      expect(partial.explanation).toContain('area_solid_fill');
    });

    it('keeps a defect open when its panel was deleted instead of fixed', async () => {
      const deleted = clone();
      deleted.panels = deleted.panels.filter((widget) => widget.id !== 'requests-over-time');
      const result = await run(
        enhanceDefectResolutionEvaluator,
        gold({ defects: ['xy_legend'] }),
        output({ dashboard: deleted })
      );
      expect(result.score).toBe(0);
      expect(result.explanation).toContain('deleted instead of fixed');
    });
  });

  describe('no regression', () => {
    it('passes when nothing the seed met is broken, and abstains without a write', async () => {
      expect((await run(enhanceNoRegressionEvaluator, gold(), output({}))).score).toBe(1);
      expect(
        (await run(enhanceNoRegressionEvaluator, gold(), output({ steps: [] }))).score
      ).toBeNull();
    });

    it('flags a rule the seed met that the result breaks', async () => {
      const regressed = clone();
      findPanel(regressed, 'unique-visitors').config.title = 'Unique visitors';
      const result = await run(
        enhanceNoRegressionEvaluator,
        gold(),
        output({ dashboard: regressed })
      );
      expect(result.score).toBeLessThan(1);
      expect(result.explanation).toContain('summary_panel_titled');
    });
  });
});
