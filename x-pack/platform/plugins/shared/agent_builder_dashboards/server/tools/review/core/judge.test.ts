/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider } from '@kbn/agent-builder-server';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { Logger } from '@kbn/logging';
import { judgeDashboard } from './judge';
import type { PanelFacts } from './panel_facts';

const createLogger = (): Logger =>
  ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn() } as unknown as Logger);

describe('judgeDashboard', () => {
  it('includes fields from ES|QL-backed and field-backed controls in the judge prompt', async () => {
    const invoke = jest.fn().mockResolvedValue({ overall_assessment: 'Looks good', findings: [] });
    const withStructuredOutput = jest.fn().mockReturnValue({ invoke });
    const modelProvider = {
      getDefaultModel: jest.fn().mockResolvedValue({
        chatModel: { withStructuredOutput },
      }),
    } as unknown as ModelProvider;
    const dashboardData: DashboardAttachmentData = {
      title: 'Test dashboard',
      panels: [],
      pinned_panels: [
        {
          id: 'service-control',
          type: 'options_list_control',
          config: {
            title: 'Service',
            values_source: 'esql',
            esql_query: 'FROM logs-* | STATS BY `service.name`',
          },
        },
        {
          id: 'latency-control',
          type: 'range_slider_control',
          config: {
            title: 'Latency',
            values_source: 'field',
            field_name: 'transaction.duration.us',
          },
        },
      ],
    };

    await judgeDashboard({
      dashboardData,
      panelFacts: [],
      focus: undefined,
      modelProvider,
      logger: createLogger(),
    });

    const messages = invoke.mock.calls[0][0] as Array<{ role: string; content: string }>;
    expect(messages[0].content).toContain(
      'type: options_list_control, title: Service, field: service.name'
    );
    expect(messages[0].content).toContain(
      'type: range_slider_control, title: Latency, field: transaction.duration.us'
    );
  });

  it('groups panel facts under their sections in dashboard order', async () => {
    const invoke = jest.fn().mockResolvedValue({ overall_assessment: 'Looks good', findings: [] });
    const withStructuredOutput = jest.fn().mockReturnValue({ invoke });
    const modelProvider = {
      getDefaultModel: jest.fn().mockResolvedValue({
        chatModel: { withStructuredOutput },
      }),
    } as unknown as ModelProvider;
    const panel = (id: string) => ({
      id,
      type: 'markdown',
      config: { content: id },
      grid: { x: 0, y: 0, w: 24, h: 10 },
    });
    const dashboardData: DashboardAttachmentData = {
      title: 'Sectioned dashboard',
      panels: [
        panel('overview-panel'),
        {
          id: 'traffic-section',
          title: 'Traffic section',
          collapsed: false,
          grid: { y: 10 },
          panels: [panel('requests-panel')],
        },
        {
          id: 'reliability-section',
          title: 'Reliability section',
          collapsed: true,
          grid: { y: 20 },
          panels: [panel('errors-panel')],
        },
      ],
    };
    const panelFacts = ['errors-panel', 'requests-panel', 'overview-panel'].map(
      (panelId): PanelFacts => ({
        panel_id: panelId,
        title: panelId,
        grid: { x: 0, y: 0, w: 24, h: 10 },
        panel_type: 'markdown',
        config: { content: panelId },
        execution_status: 'no_query',
      })
    );

    await judgeDashboard({
      dashboardData,
      panelFacts,
      focus: undefined,
      modelProvider,
      logger: createLogger(),
    });

    const messages = invoke.mock.calls[0][0] as Array<{ role: string; content: string }>;
    const prompt = messages[0].content;
    const factsText = prompt.slice(prompt.indexOf('## Panel Facts'));
    const overviewIndex = factsText.indexOf('Panel id: overview-panel');
    const trafficIndex = factsText.indexOf('Section id: traffic-section');
    const requestsIndex = factsText.indexOf('Panel id: requests-panel');
    const reliabilityIndex = factsText.indexOf('Section id: reliability-section');
    const errorsIndex = factsText.indexOf('Panel id: errors-panel');

    expect(overviewIndex).toBeGreaterThan(-1);
    expect(overviewIndex).toBeLessThan(trafficIndex);
    expect(trafficIndex).toBeLessThan(requestsIndex);
    expect(requestsIndex).toBeLessThan(reliabilityIndex);
    expect(reliabilityIndex).toBeLessThan(errorsIndex);
    expect(factsText).toContain('Grid within section: x=0 y=0 w=24 h=10');
  });

  describe('full_audit scope', () => {
    const makePanelFacts = (id: string): PanelFacts => ({
      panel_id: id,
      title: id,
      grid: { x: 0, y: 0, w: 24, h: 10 },
      panel_type: 'markdown',
      config: { content: id },
      execution_status: 'no_query',
    });

    const makeDashboard = (panelIds: string[]): DashboardAttachmentData => ({
      title: 'Audit dashboard',
      panels: panelIds.map((id) => ({
        id,
        type: 'markdown',
        config: { content: id },
        grid: { x: 0, y: 0, w: 24, h: 10 },
      })),
    });

    const createModelProvider = (invoke: jest.Mock): ModelProvider =>
      ({
        getDefaultModel: jest.fn().mockResolvedValue({
          chatModel: { withStructuredOutput: jest.fn().mockReturnValue({ invoke }) },
        }),
      } as unknown as ModelProvider);

    it('fans out into panel batches plus a holistic pass and merges findings', async () => {
      const panelIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
      const invoke = jest.fn(async (messages: Array<{ content: string }>) => {
        const prompt = messages[0].content;
        if (prompt.includes('## Panel Digest')) {
          return {
            overall_assessment: 'Needs work',
            findings: [
              {
                scope: 'dashboard',
                category: 'redundancy',
                severity: 'warning',
                issue: 'p1 and p2 duplicate each other',
                suggestion: 'Remove one',
                panel_ids: ['p1', 'p2'],
              },
            ],
          };
        }
        if (prompt.includes('Panel id: p1')) {
          return {
            findings: [
              {
                scope: 'panel',
                category: 'data',
                severity: 'critical',
                issue: 'p3 query errors',
                suggestion: 'Fix the query',
                panel_ids: ['p3'],
              },
            ],
          };
        }
        return { findings: [] };
      });

      const result = await judgeDashboard({
        dashboardData: makeDashboard(panelIds),
        panelFacts: panelIds.map(makePanelFacts),
        focus: undefined,
        scope: 'full_audit',
        modelProvider: createModelProvider(invoke),
        logger: createLogger(),
      });

      // 7 panels → 2 batches of ≤5, plus 1 holistic pass.
      expect(invoke).toHaveBeenCalledTimes(3);
      const prompts = invoke.mock.calls.map(
        (call) => (call[0] as Array<{ content: string }>)[0].content
      );
      const holisticPrompts = prompts.filter((prompt) => prompt.includes('## Panel Digest'));
      expect(holisticPrompts).toHaveLength(1);
      // The holistic pass gets digests, not raw configs or sample rows.
      expect(holisticPrompts[0]).not.toContain('Config:');
      const batchPrompts = prompts.filter((prompt) => prompt.includes('## Panels to Review'));
      expect(batchPrompts).toHaveLength(2);
      expect(batchPrompts.some((prompt) => prompt.includes('Panel id: p1'))).toBe(true);
      expect(batchPrompts.some((prompt) => prompt.includes('Panel id: p7'))).toBe(true);

      expect(result.overall_assessment).toBe('Needs work');
      // Critical batch finding sorts before the holistic warning; category is stripped.
      expect(result.findings).toEqual([
        {
          scope: 'panel',
          severity: 'critical',
          issue: 'p3 query errors',
          suggestion: 'Fix the query',
          panel_ids: ['p3'],
        },
        {
          scope: 'dashboard',
          severity: 'warning',
          issue: 'p1 and p2 duplicate each other',
          suggestion: 'Remove one',
          panel_ids: ['p1', 'p2'],
        },
      ]);
      expect(result.unreviewed_panel_ids).toBeUndefined();
    });

    it('dedupes holistic findings that repeat a batch finding by category and panel set', async () => {
      const finding = {
        scope: 'panel',
        category: 'title',
        severity: 'warning',
        issue: 'Redundant title',
        suggestion: 'Remove it',
        panel_ids: ['p1'],
      };
      const invoke = jest.fn(async (messages: Array<{ content: string }>) => {
        const prompt = messages[0].content;
        if (prompt.includes('## Panel Digest')) {
          return { overall_assessment: 'ok', findings: [{ ...finding, issue: 'Duplicate copy' }] };
        }
        return { findings: [finding] };
      });

      const result = await judgeDashboard({
        dashboardData: makeDashboard(['p1']),
        panelFacts: [makePanelFacts('p1')],
        focus: undefined,
        scope: 'full_audit',
        modelProvider: createModelProvider(invoke),
        logger: createLogger(),
      });

      // The batch (per-panel) version wins.
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].issue).toBe('Redundant title');
    });

    it('reports panels from failed batches as unreviewed and keeps other results', async () => {
      const panelIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
      const invoke = jest.fn(async (messages: Array<{ content: string }>) => {
        const prompt = messages[0].content;
        if (prompt.includes('## Panel Digest')) {
          return { overall_assessment: 'partial', findings: [] };
        }
        if (prompt.includes('Panel id: p6')) {
          throw new Error('model unavailable');
        }
        return { findings: [] };
      });

      const result = await judgeDashboard({
        dashboardData: makeDashboard(panelIds),
        panelFacts: panelIds.map(makePanelFacts),
        focus: undefined,
        scope: 'full_audit',
        modelProvider: createModelProvider(invoke),
        logger: createLogger(),
      });

      expect(result.unreviewed_panel_ids).toEqual(['p6']);
      expect(result.overall_assessment).toBe('partial');
    });
  });
});
