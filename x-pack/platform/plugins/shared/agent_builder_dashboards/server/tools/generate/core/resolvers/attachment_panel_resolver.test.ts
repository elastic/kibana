/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import {
  VISUALIZATION_ATTACHMENT_TYPE,
  VEGA_VIS_TYPE,
} from '@kbn/agent-builder-visualizations-common';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { createAttachmentPanelResolver } from './attachment_panel_resolver';

const makeAttachments = (record?: Record<string, unknown>): AttachmentStateManager =>
  ({
    getAttachmentRecord: jest.fn().mockReturnValue(record),
  } as unknown as AttachmentStateManager);

const makeVisualizationAttachment = (data: Record<string, unknown>) => ({
  id: 'att-1',
  type: VISUALIZATION_ATTACHMENT_TYPE,
  current_version: 1,
  versions: [{ version: 1, data }],
});

describe('createAttachmentPanelResolver', () => {
  it('maps a Lens attachment onto the Lens embeddable', () => {
    const resolve = createAttachmentPanelResolver({
      attachments: makeAttachments(
        makeVisualizationAttachment({
          renderer: 'lens',
          query: 'errors over time',
          visualization: { type: 'lnsXY' },
          esql: 'FROM logs',
        })
      ),
    });

    expect(resolve('att-1', 'add_panels')).toEqual({
      type: 'success',
      panelContent: { type: LENS_EMBEDDABLE_TYPE, config: { type: 'lnsXY' } },
    });
  });

  // Attachments created before the discriminator existed are implicitly Lens.
  it('treats an attachment with no renderer as Lens', () => {
    const resolve = createAttachmentPanelResolver({
      attachments: makeAttachments(
        makeVisualizationAttachment({
          query: 'errors over time',
          visualization: { type: 'lnsXY' },
          esql: 'FROM logs',
        })
      ),
    });

    expect(resolve('att-1', 'add_panels')).toMatchObject({
      panelContent: { type: LENS_EMBEDDABLE_TYPE },
    });
  });

  it('maps a Vega attachment onto the Vega panel type', () => {
    const resolve = createAttachmentPanelResolver({
      attachments: makeAttachments(
        makeVisualizationAttachment({
          renderer: 'vega',
          query: 'faceted bars',
          visualization: { spec: '{"$schema":"vega-lite"}' },
          esql: 'FROM logs',
        })
      ),
    });

    expect(resolve('att-1', 'add_panels')).toEqual({
      type: 'success',
      panelContent: { type: VEGA_VIS_TYPE, config: { spec: '{"$schema":"vega-lite"}' } },
    });
  });

  it('maps a custom content attachment onto the custom content embeddable state', () => {
    const resolve = createAttachmentPanelResolver({
      attachments: makeAttachments(
        makeVisualizationAttachment({
          renderer: 'custom_content',
          query: 'a status board',
          visualization: { template: '<div>board</div>', height: 420 },
          esql: 'FROM logs | STATS count() BY host',
        })
      ),
    });

    expect(resolve('att-1', 'add_panels')).toEqual({
      type: 'success',
      panelContent: {
        type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
        config: {
          template: '<div>board</div>',
          esql_query: ['FROM logs | STATS count() BY host'],
        },
      },
    });
  });

  it('carries no query for a static custom content attachment', () => {
    const resolve = createAttachmentPanelResolver({
      attachments: makeAttachments(
        makeVisualizationAttachment({
          renderer: 'custom_content',
          query: 'a banner',
          visualization: { template: '<div>hi</div>' },
        })
      ),
    });

    expect(resolve('att-1', 'add_panels')).toEqual({
      type: 'success',
      panelContent: {
        type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
        config: { template: '<div>hi</div>', esql_query: undefined },
      },
    });
  });

  // Failures are returned, not thrown: one bad id fails its own panel and is reported
  // alongside the others rather than aborting the whole operation.
  it('attributes the failure to the operation that asked for the panel', () => {
    const resolve = createAttachmentPanelResolver({ attachments: makeAttachments(undefined) });

    expect(resolve('missing', 'add_section')).toMatchObject({
      type: 'failure',
      failure: { type: 'add_section' },
    });
  });

  it('fails when the attachment does not exist', () => {
    const resolve = createAttachmentPanelResolver({ attachments: makeAttachments(undefined) });

    expect(resolve('missing', 'add_panels')).toMatchObject({
      type: 'failure',
      failure: { identifier: 'missing', error: expect.stringContaining('not found') },
    });
  });

  it('fails when the attachment is not a visualization', () => {
    const resolve = createAttachmentPanelResolver({
      attachments: makeAttachments({
        id: 'att-1',
        type: 'platform.dashboard.dashboard_state',
        current_version: 1,
        versions: [{ version: 1, data: {} }],
      }),
    });

    expect(resolve('att-1', 'add_panels')).toMatchObject({
      type: 'failure',
      failure: { error: expect.stringContaining('only visualization and') },
    });
  });

  it('fails when the attachment has no readable visualization data', () => {
    const resolve = createAttachmentPanelResolver({
      attachments: makeAttachments({
        id: 'att-1',
        type: VISUALIZATION_ATTACHMENT_TYPE,
        current_version: 1,
        versions: [],
      }),
    });

    expect(resolve('att-1', 'add_panels')).toMatchObject({
      type: 'failure',
      failure: { error: expect.stringContaining('no readable visualization data') },
    });
  });
});

describe('createAttachmentPanelResolver with dashboard panel pointers', () => {
  const pointerId = 'platform.dashboard.panel-panel-1';
  const dashboardPanel = {
    type: 'lens',
    id: 'panel-1',
    grid: { x: 0, y: 0, w: 24, h: 15 },
    config: { type: 'xy', title: 'Top paths', layers: [] },
  };

  const pointer = (dashboardAttachmentId = 'dashboard-1', panelId = 'panel-1') => ({
    id: pointerId,
    type: 'platform.dashboard.panel',
    current_version: 1,
    versions: [
      {
        version: 1,
        data: {
          dashboard_attachment_id: dashboardAttachmentId,
          panel_id: panelId,
          label: 'Top paths',
          panel_type: 'lens',
        },
      },
    ],
  });

  const dashboard = (panels: unknown[] = [dashboardPanel]) => ({
    id: 'dashboard-1',
    type: 'platform.dashboard.dashboard_state',
    current_version: 1,
    versions: [{ version: 1, data: { title: 'Dashboard', panels } }],
  });

  const makeStore = (records: Record<string, unknown>): AttachmentStateManager =>
    ({
      getAttachmentRecord: jest.fn((id: string) => records[id]),
    } as unknown as AttachmentStateManager);

  const failureError = (attempt: ReturnType<ReturnType<typeof createAttachmentPanelResolver>>) => {
    if (attempt.type !== 'failure') {
      throw new Error('expected a failure attempt');
    }
    return attempt.failure.error;
  };

  it('copies the pointed panel type and config verbatim', () => {
    const resolve = createAttachmentPanelResolver({
      attachments: makeStore({ [pointerId]: pointer(), 'dashboard-1': dashboard() }),
    });

    expect(resolve(pointerId, 'add_panels')).toEqual({
      type: 'success',
      panelContent: { type: 'lens', config: dashboardPanel.config },
    });
  });

  it('fails when the pointed dashboard attachment is not in the conversation', () => {
    const resolve = createAttachmentPanelResolver({
      attachments: makeStore({ [pointerId]: pointer('missing-dashboard') }),
    });

    expect(failureError(resolve(pointerId, 'add_panels'))).toContain('missing-dashboard');
  });

  it('fails and tells the agent to report a panel that no longer exists', () => {
    const resolve = createAttachmentPanelResolver({
      attachments: makeStore({ [pointerId]: pointer(), 'dashboard-1': dashboard([]) }),
    });

    expect(failureError(resolve(pointerId, 'add_panels'))).toContain('no longer exists');
  });

  it('names both accepted attachment types when rejecting another type', () => {
    const resolve = createAttachmentPanelResolver({
      attachments: makeStore({
        'other-1': { id: 'other-1', type: 'text', current_version: 1, versions: [] },
      }),
    });

    const error = failureError(resolve('other-1', 'add_panels'));
    expect(error).toContain(VISUALIZATION_ATTACHMENT_TYPE);
    expect(error).toContain('platform.dashboard.panel');
  });
});
