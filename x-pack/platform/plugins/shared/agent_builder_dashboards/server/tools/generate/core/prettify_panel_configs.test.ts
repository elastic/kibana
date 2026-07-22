/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  AttachmentPanel,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { ResolvePanelContent } from './operations/panels';
import { prettifyPanelConfigs } from './prettify_panel_configs';

const grid = { x: 0, y: 0, w: 12, h: 8 };
const esql = 'FROM logs-* | STATS requests = COUNT(*)';

const createPanel = (
  id: string,
  config: Record<string, unknown>,
  type = LENS_EMBEDDABLE_TYPE
): AttachmentPanel => ({
  id,
  type,
  config,
  grid,
});

const createResolvePanelContent = (
  title = 'Polished requests',
  changeSummary?: string
): jest.MockedFunction<ResolvePanelContent> =>
  jest.fn<ReturnType<ResolvePanelContent>, Parameters<ResolvePanelContent>>(async () => ({
    type: 'success',
    panelContent: {
      type: LENS_EMBEDDABLE_TYPE,
      config: {
        title,
        type: 'metric',
        data_source: { type: 'esql', query: esql },
      },
    },
    ...(changeSummary ? { changeSummary } : {}),
  }));

describe('prettifyPanelConfigs', () => {
  it('refreshes only surviving pre-existing ES|QL Lens panels', async () => {
    const survivingPanel = createPanel('surviving', {
      title: 'Requests',
      type: 'metric',
      data_source: { type: 'esql', query: esql },
    });
    const removedPanel = createPanel('removed', {
      type: 'metric',
      data_source: { type: 'esql', query: esql },
    });
    const nonEsqlPanel = createPanel('non-esql', {
      title: 'Legacy requests',
      type: 'metric',
      data_source: { type: 'index_pattern', id: 'logs-*' },
    });
    const newPanel = createPanel('new', {
      title: 'New panel',
      type: 'metric',
      data_source: { type: 'esql', query: esql },
    });
    const dashboardData: DashboardAttachmentData = {
      title: 'Service overview',
      panels: [survivingPanel, nonEsqlPanel, newPanel],
    };
    const resolvePanelContent = createResolvePanelContent();

    const result = await prettifyPanelConfigs({
      dashboardData,
      existingPanels: [survivingPanel, removedPanel, nonEsqlPanel],
      resolvePanelContent,
    });

    expect(resolvePanelContent).toHaveBeenCalledTimes(1);
    expect(resolvePanelContent).toHaveBeenCalledWith({
      type: 'vis',
      operationType: 'prettify_panel_configs',
      identifier: 'surviving',
      nlQuery: expect.any(String),
      chartType: SupportedChartType.Metric,
      esql,
      additionalChartConfigInstructions: expect.any(String),
      existingPanel: survivingPanel,
    });
    expect(result.dashboardData.panels).toEqual([
      expect.objectContaining({
        id: 'surviving',
        config: expect.objectContaining({ title: 'Polished requests' }),
      }),
      nonEsqlPanel,
      newPanel,
    ]);
    expect(result.failures).toEqual([]);
    expect(result.configGeneratorChanges).toEqual([]);
  });

  it('collects configGeneratorChanges from successful resolves with a change summary', async () => {
    const panel = createPanel('requests', {
      title: 'Requests',
      type: 'metric',
      data_source: { type: 'esql', query: esql },
    });
    const resolvePanelContent = createResolvePanelContent(
      'Polished requests',
      'Right-aligned the metric value.'
    );

    const result = await prettifyPanelConfigs({
      dashboardData: { title: 'Service overview', panels: [panel] },
      existingPanels: [panel],
      resolvePanelContent,
    });

    expect(result.configGeneratorChanges).toEqual([
      {
        panelId: 'requests',
        title: 'Polished requests',
        changeSummary: 'Right-aligned the metric value.',
      },
    ]);
  });

  it('omits configGeneratorChanges entries when the resolve has no change summary', async () => {
    const panel = createPanel('requests', {
      title: 'Requests',
      type: 'metric',
      data_source: { type: 'esql', query: esql },
    });
    const resolvePanelContent = createResolvePanelContent();

    const result = await prettifyPanelConfigs({
      dashboardData: { title: 'Service overview', panels: [panel] },
      existingPanels: [panel],
      resolvePanelContent,
    });

    expect(result.configGeneratorChanges).toEqual([]);
  });

  it('silently skips unsupported chart types and multi-query panels', async () => {
    const unsupportedType = createPanel('unsupported', {
      title: 'Unknown',
      type: 'not-a-chart-type',
      data_source: { type: 'esql', query: esql },
    });
    const multiQuery = createPanel('multi-query', {
      title: 'Combo',
      type: 'xy',
      layers: [
        { data_source: { type: 'esql', query: esql } },
        { data_source: { type: 'esql', query: `${esql} BY host.name` } },
      ],
    });
    const dashboardData: DashboardAttachmentData = {
      title: 'Service overview',
      panels: [unsupportedType, multiQuery],
    };
    const resolvePanelContent = createResolvePanelContent();

    const result = await prettifyPanelConfigs({
      dashboardData,
      existingPanels: [unsupportedType, multiQuery],
      resolvePanelContent,
    });

    expect(resolvePanelContent).not.toHaveBeenCalled();
    expect(result.dashboardData).toEqual(dashboardData);
    expect(result.failures).toEqual([]);
  });

  it('skips panels already content-resolved in this call', async () => {
    const editedPanel = createPanel('edited', {
      title: 'Edited',
      type: 'metric',
      data_source: { type: 'esql', query: esql },
    });
    const untouchedPanel = createPanel('untouched', {
      title: 'Untouched',
      type: 'metric',
      data_source: { type: 'esql', query: esql },
    });
    const dashboardData: DashboardAttachmentData = {
      title: 'Service overview',
      panels: [editedPanel, untouchedPanel],
    };
    const resolvePanelContent = createResolvePanelContent('Polished untouched');

    const result = await prettifyPanelConfigs({
      dashboardData,
      existingPanels: [editedPanel, untouchedPanel],
      resolvePanelContent,
      skipPanelIds: new Set(['edited']),
    });

    expect(resolvePanelContent).toHaveBeenCalledTimes(1);
    expect(resolvePanelContent).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: 'untouched' })
    );
    expect(result.dashboardData.panels).toEqual([
      editedPanel,
      expect.objectContaining({
        id: 'untouched',
        config: expect.objectContaining({ title: 'Polished untouched' }),
      }),
    ]);
  });

  it('records resolve failures for panels that were attempted', async () => {
    const panel = createPanel('broken', {
      title: 'Broken',
      type: 'metric',
      data_source: { type: 'esql', query: esql },
    });
    const resolvePanelContent = jest.fn<
      ReturnType<ResolvePanelContent>,
      Parameters<ResolvePanelContent>
    >(async () => ({
      type: 'failure',
      failure: {
        type: 'prettify_panel_configs',
        identifier: 'broken',
        error: 'inner agent failed',
      },
    }));

    const result = await prettifyPanelConfigs({
      dashboardData: { title: 'Service overview', panels: [panel] },
      existingPanels: [panel],
      resolvePanelContent,
    });

    expect(result.dashboardData.panels).toEqual([panel]);
    expect(result.failures).toEqual([
      {
        type: 'prettify_panel_configs',
        identifier: 'broken',
        error: 'inner agent failed',
      },
    ]);
  });
});
