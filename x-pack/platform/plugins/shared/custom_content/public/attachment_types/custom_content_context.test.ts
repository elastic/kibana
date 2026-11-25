/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { GetActionButtonsParams } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type {
  CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  CustomContentContextAttachmentData,
} from '../../common/panel_context_attachment';
import { customContentContextAttachmentUiDefinition } from './custom_content_context';

const mockPreviewPanelVersion = jest.fn();
jest.mock('../utils/panel_preview_registry', () => ({
  previewPanelVersion: (...args: unknown[]) => mockPreviewPanelVersion(...args),
}));

const mockAddWarning = jest.fn();
jest.mock('../services', () => ({
  getServices: () => ({ core: { notifications: { toasts: { addWarning: mockAddWarning } } } }),
}));

type CustomContentAttachment = Attachment<
  typeof CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  CustomContentContextAttachmentData
>;

const makeAttachment = (
  data: Partial<CustomContentContextAttachmentData> = {}
): CustomContentAttachment =>
  ({
    id: 'att-1',
    type: 'platform.custom_content.panel_context',
    data: {
      panel_template: '<p>v1</p>',
      esql_query: 'FROM logs',
      panel_title: 'My Panel',
      embeddable_id: 'panel-1',
      ...data,
    },
  } as CustomContentAttachment);

const getButtons = (attachment: CustomContentAttachment, isCanvas = false) =>
  customContentContextAttachmentUiDefinition.getActionButtons!({
    attachment,
    isCanvas,
    isSidebar: true,
    updateOrigin: jest.fn(),
  } as unknown as GetActionButtonsParams<CustomContentAttachment>);

describe('customContentContextAttachmentUiDefinition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPreviewPanelVersion.mockReturnValue(true);
  });

  describe('getLabel', () => {
    it('uses the panel title', () => {
      expect(customContentContextAttachmentUiDefinition.getLabel(makeAttachment())).toBe(
        'My Panel'
      );
    });

    it('falls back to a generic label when the panel is untitled', () => {
      expect(
        customContentContextAttachmentUiDefinition.getLabel(makeAttachment({ panel_title: '' }))
      ).toBe('Custom panel');
    });
  });

  describe('rendering surface', () => {
    // Inline renders the snapshot so a version can be read in the conversation. Canvas stays
    // undefined on purpose: it is the only thing that opens the expanded flyout
    // (see `canvas_flyout.tsx`), and a panel belongs on its dashboard, not in a flyout.
    it('renders inline content but never canvas content', () => {
      expect(customContentContextAttachmentUiDefinition.renderInlineContent).toBeDefined();
      expect(customContentContextAttachmentUiDefinition.renderCanvasContent).toBeUndefined();
    });
  });

  describe('getActionButtons', () => {
    it('exposes a single secondary Preview action', () => {
      const buttons = getButtons(makeAttachment());
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toEqual(
        expect.objectContaining({ label: 'Preview', type: ActionButtonType.SECONDARY })
      );
    });

    it('returns no actions in canvas mode', () => {
      expect(getButtons(makeAttachment(), true)).toEqual([]);
    });

    it('applies the clicked version rather than the latest', async () => {
      const attachment = makeAttachment({ panel_template: '<p>older</p>' });
      await getButtons(attachment)[0].handler();

      expect(mockPreviewPanelVersion).toHaveBeenCalledWith(
        expect.objectContaining({ panel_template: '<p>older</p>', embeddable_id: 'panel-1' })
      );
      expect(mockAddWarning).not.toHaveBeenCalled();
    });

    it('warns instead of failing silently when the panel is not mounted', async () => {
      mockPreviewPanelVersion.mockReturnValue(false);
      await getButtons(makeAttachment())[0].handler();

      expect(mockAddWarning).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Panel is no longer open' })
      );
    });
  });
});
