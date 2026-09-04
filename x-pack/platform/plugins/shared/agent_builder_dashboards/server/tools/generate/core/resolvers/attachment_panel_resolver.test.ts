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

    expect(resolve('att-1')).toEqual({
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

    expect(resolve('att-1')).toMatchObject({
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

    expect(resolve('att-1')).toEqual({
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

    expect(resolve('att-1')).toEqual({
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

    expect(resolve('att-1')).toEqual({
      type: 'success',
      panelContent: {
        type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
        config: { template: '<div>hi</div>', esql_query: undefined },
      },
    });
  });

  // Failures are returned, not thrown: one bad id fails its own panel and is reported
  // alongside the others rather than aborting the whole operation.
  it('fails when the attachment does not exist', () => {
    const resolve = createAttachmentPanelResolver({ attachments: makeAttachments(undefined) });

    expect(resolve('missing')).toMatchObject({
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

    expect(resolve('att-1')).toMatchObject({
      type: 'failure',
      failure: { error: expect.stringContaining('only visualization attachments') },
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

    expect(resolve('att-1')).toMatchObject({
      type: 'failure',
      failure: { error: expect.stringContaining('no readable visualization data') },
    });
  });
});
