/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { ToolType } from '@kbn/agent-builder-common';
import { KIBANA_EUI_CATALOG_ID } from '@kbn/agent-builder-common/attachments';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { createA2UISurfaceTool } from './create_a2ui_surface';

const createMockContext = (
  overrides: Partial<{
    attachments: Partial<ToolHandlerContext['attachments']>;
  }> = {}
): ToolHandlerContext => {
  return {
    logger: {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    },
    attachments: {
      add: jest.fn().mockResolvedValue({ id: 'new-attachment-id', current_version: 1 }),
      update: jest.fn().mockResolvedValue({ current_version: 2 }),
      getAttachmentRecord: jest.fn().mockReturnValue(null),
      ...overrides.attachments,
    },
  } as unknown as ToolHandlerContext;
};

const validComponents = [
  { id: 'root', component: 'Column', children: ['stat1', 'text1'] },
  { id: 'stat1', component: 'Stat', title: 'CPU', value: '72%' },
  { id: 'text1', component: 'Text', text: 'Hello' },
];

describe('createA2UISurfaceTool', () => {
  const tool = createA2UISurfaceTool();

  it('has the correct tool id and type', () => {
    expect(tool.id).toBe(platformCoreTools.createA2UISurface);
    expect(tool.type).toBe(ToolType.builtin);
  });

  it('has a description mentioning A2UI', () => {
    expect(tool.description).toContain('A2UI');
    expect(tool.description).toContain('render_attachment');
  });

  describe('handler - create new surface', () => {
    it('creates a new attachment with correct data', async () => {
      const ctx = createMockContext();

      const result = await tool.handler(
        {
          surface_id: 'test_surface',
          title: 'Test Surface',
          components: validComponents,
          data_model: { cpu: '72%' },
        },
        ctx
      );

      expect(ctx.attachments.add).toHaveBeenCalledWith({
        type: 'a2ui_surface',
        data: {
          surface_id: 'test_surface',
          catalog_id: KIBANA_EUI_CATALOG_ID,
          components: validComponents,
          data_model: { cpu: '72%' },
          title: 'Test Surface',
        },
        description: 'A2UI Surface: Test Surface',
      });

      expect(result).toEqual({
        results: [
          expect.objectContaining({
            type: 'other',
            data: expect.objectContaining({
              surface_id: 'test_surface',
              attachment_id: 'new-attachment-id',
              version: 1,
              is_update: false,
            }),
          }),
        ],
      });
    });

    it('creates attachment without optional fields', async () => {
      const ctx = createMockContext();

      await tool.handler({ surface_id: 'minimal', components: validComponents }, ctx);

      expect(ctx.attachments.add).toHaveBeenCalledWith({
        type: 'a2ui_surface',
        data: {
          surface_id: 'minimal',
          catalog_id: KIBANA_EUI_CATALOG_ID,
          components: validComponents,
        },
        description: 'A2UI Surface: minimal',
      });
    });

    it('uses surface_id as description fallback when title is absent', async () => {
      const ctx = createMockContext();

      await tool.handler({ surface_id: 'fallback_test', components: validComponents }, ctx);

      expect(ctx.attachments.add).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'A2UI Surface: fallback_test' })
      );
    });
  });

  describe('handler - update existing surface', () => {
    it('updates an existing attachment when attachment_id is provided', async () => {
      const ctx = createMockContext({
        attachments: {
          getAttachmentRecord: jest
            .fn()
            .mockReturnValue({ id: 'existing-id', type: 'a2ui_surface' }),
          update: jest.fn().mockResolvedValue({ current_version: 3 }),
          add: jest.fn(),
        },
      });

      const result = await tool.handler(
        {
          surface_id: 'updated_surface',
          title: 'Updated',
          components: validComponents,
          attachment_id: 'existing-id',
        },
        ctx
      );

      expect(ctx.attachments.update).toHaveBeenCalledWith('existing-id', {
        data: expect.objectContaining({ surface_id: 'updated_surface' }),
        description: 'A2UI Surface: Updated',
      });
      expect(ctx.attachments.add).not.toHaveBeenCalled();

      expect(result).toEqual({
        results: [
          expect.objectContaining({
            data: expect.objectContaining({
              attachment_id: 'existing-id',
              version: 3,
              is_update: true,
            }),
          }),
        ],
      });
    });

    it('falls back to creating when attachment_id is not found', async () => {
      const ctx = createMockContext({
        attachments: {
          getAttachmentRecord: jest.fn().mockReturnValue(null),
        },
      });

      await tool.handler(
        {
          surface_id: 'new_surface',
          components: validComponents,
          attachment_id: 'nonexistent-id',
        },
        ctx
      );

      expect(ctx.attachments.add).toHaveBeenCalled();
    });
  });

  describe('handler - error handling', () => {
    it('returns an error result when attachment creation fails', async () => {
      const ctx = createMockContext({
        attachments: {
          add: jest.fn().mockRejectedValue(new Error('Validation failed: missing root')),
        },
      });

      const result = await tool.handler(
        { surface_id: 'bad', components: [{ id: 'not_root', component: 'Text', text: 'Hi' }] },
        ctx
      );

      expect(result).toEqual({
        results: [
          expect.objectContaining({
            type: 'error',
            data: expect.objectContaining({
              message: expect.stringContaining('Validation failed'),
            }),
          }),
        ],
      });
    });
  });
});
