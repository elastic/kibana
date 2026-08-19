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

const createLogger = (): Logger => ({ debug: jest.fn(), info: jest.fn() } as unknown as Logger);

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
});
