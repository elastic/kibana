/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { dashboardTools } from '../../../common';
import { reviewPanelsTool } from './review_panels_tool';

const grid = { x: 0, y: 0, w: 24, h: 12 };

const lensPanel = {
  type: LENS_EMBEDDABLE_TYPE,
  id: 'lens-1',
  grid,
  config: { title: 'Error rate' },
};

const imageData = {
  file_id: 'file-1',
  name: 'dashboard-prettify.png',
  mime_type: 'image/png' as const,
};

const createAttachments = async ({
  withDashboard = true,
  withImage = true,
}: { withDashboard?: boolean; withImage?: boolean } = {}) => {
  const attachments = createAttachmentStateManager([], {
    getTypeDefinition: () => ({
      id: 'any',
      validate: (input: unknown) => ({ valid: true as const, data: input }),
      format: () => ({}),
    }),
  });

  if (withDashboard) {
    await attachments.add({
      type: DASHBOARD_ATTACHMENT_TYPE,
      data: { title: 'Metrics', panels: [lensPanel] },
    });
  }
  if (withImage) {
    await attachments.add({
      type: AttachmentType.image,
      data: imageData,
    });
  }

  return attachments;
};

const createContext = async (options?: { withDashboard?: boolean; withImage?: boolean }) =>
  ({
    attachments: await createAttachments(options),
    logger: { error: jest.fn(), debug: jest.fn() },
    modelProvider: {},
  } as unknown as ToolHandlerContext);

describe('reviewPanelsTool', () => {
  const inspectDashboardImage = jest.fn();
  const getImageBytes = jest.fn();

  const createTool = () =>
    reviewPanelsTool({
      inspectDashboardImage,
      getImageBytes,
    });

  beforeEach(() => {
    inspectDashboardImage.mockReset().mockResolvedValue([
      {
        panel_id: 'lens-1',
        rule: 'disproportionate_size',
        what: 'metric is stretched full width',
        fix: '{ x: 0, y: 0, w: 12, h: 5 }',
      },
    ]);
    getImageBytes.mockReset().mockResolvedValue(Buffer.from('png'));
  });

  it('uses the review_panels tool id', () => {
    expect(createTool().id).toBe(dashboardTools.reviewPanels);
  });

  it('fails closed without an image and does not call vision', async () => {
    const tool = createTool();
    const context = await createContext({ withImage: false });

    const result = await tool.handler({}, context);

    expect(getImageBytes).not.toHaveBeenCalled();
    expect(inspectDashboardImage).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        expect.objectContaining({
          type: 'error',
          data: expect.objectContaining({
            message: expect.stringMatching(/image/i),
          }),
        }),
      ],
    });
  });

  it('fails closed without a dashboard and does not call vision', async () => {
    const tool = createTool();
    const context = await createContext({ withDashboard: false });

    const result = await tool.handler({}, context);

    expect(inspectDashboardImage).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        expect.objectContaining({
          type: 'error',
          data: expect.objectContaining({
            message: expect.stringMatching(/dashboard/i),
          }),
        }),
      ],
    });
  });

  it('inspects the painted dashboard image and returns panel findings without image bytes', async () => {
    const tool = createTool();
    const context = await createContext();

    const result = await tool.handler({}, context);

    expect(getImageBytes).toHaveBeenCalledWith('file-1');
    expect(inspectDashboardImage).toHaveBeenCalledWith(
      expect.objectContaining({
        panels: [expect.objectContaining({ id: 'lens-1', title: 'Error rate' })],
        image: expect.objectContaining({
          bytes: Buffer.from('png'),
          mimeType: 'image/png',
        }),
      })
    );
    expect(JSON.stringify(result)).not.toContain('png');
    expect(result).toEqual({
      results: [
        expect.objectContaining({
          type: 'other',
          data: {
            findings: [
              {
                panel_id: 'lens-1',
                rule: 'disproportionate_size',
                what: 'metric is stretched full width',
                fix: '{ x: 0, y: 0, w: 12, h: 5 }',
              },
            ],
          },
        }),
      ],
    });
  });
});
