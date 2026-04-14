/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  AttachmentType,
  type A2UISurfaceAttachmentData,
} from '@kbn/agent-builder-common/attachments';
import { KIBANA_EUI_CATALOG_ID } from '@kbn/agent-builder-common/attachments';
import type { AgentFormattedAttachment } from '@kbn/agent-builder-server/attachments';
import { createA2UISurfaceAttachmentType } from './a2ui_surface';

const createAttachment = (
  data: A2UISurfaceAttachmentData
): Attachment<AttachmentType.a2uiSurface, A2UISurfaceAttachmentData> => ({
  id: 'test-attachment-id',
  type: AttachmentType.a2uiSurface,
  data,
});

const validData: A2UISurfaceAttachmentData = {
  surface_id: 'test_surface',
  catalog_id: KIBANA_EUI_CATALOG_ID,
  title: 'Test Surface',
  components: [
    { id: 'root', component: 'Column', children: ['stat1', 'text1'] },
    { id: 'stat1', component: 'Stat', title: 'CPU', value: '72%' },
    { id: 'text1', component: 'Text', text: 'Hello' },
  ],
  data_model: { cpu: '72%' },
};

const formatContext = {
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'default',
};

describe('a2ui_surface attachment type', () => {
  const a2uiType = createA2UISurfaceAttachmentType();

  describe('validate', () => {
    it('accepts valid surface data', () => {
      const result = a2uiType.validate(validData);
      expect(result).toEqual({ valid: true, data: validData });
    });

    it('accepts minimal surface with only root', () => {
      const minimal: A2UISurfaceAttachmentData = {
        surface_id: 'minimal',
        catalog_id: KIBANA_EUI_CATALOG_ID,
        components: [{ id: 'root', component: 'Text', text: 'Hello' }],
      };
      const result = a2uiType.validate(minimal);
      expect(result).toEqual({ valid: true, data: minimal });
    });

    it('rejects data missing surface_id', () => {
      const { surface_id: _, ...data } = validData;
      const result = a2uiType.validate(data);
      expect(result).toEqual({ valid: false, error: expect.any(String) });
    });

    it('rejects data missing catalog_id', () => {
      const { catalog_id: _, ...data } = validData;
      const result = a2uiType.validate(data);
      expect(result).toEqual({ valid: false, error: expect.any(String) });
    });

    it('rejects data missing components', () => {
      const { components: _, ...data } = validData;
      const result = a2uiType.validate(data);
      expect(result).toEqual({ valid: false, error: expect.any(String) });
    });

    it('rejects empty components array', () => {
      const result = a2uiType.validate({ ...validData, components: [] });
      expect(result).toEqual({ valid: false, error: expect.stringContaining('must not be empty') });
    });

    it('rejects components without a root', () => {
      const result = a2uiType.validate({
        ...validData,
        components: [{ id: 'not_root', component: 'Text', text: 'Hi' }],
      });
      expect(result).toEqual({
        valid: false,
        error: expect.stringContaining('root'),
      });
    });

    it('rejects components with dangling child references', () => {
      const result = a2uiType.validate({
        ...validData,
        components: [{ id: 'root', component: 'Column', children: ['nonexistent'] }],
      });
      expect(result).toEqual({
        valid: false,
        error: expect.stringContaining('nonexistent'),
      });
    });

    it('accepts components with data-bound values', () => {
      const result = a2uiType.validate({
        ...validData,
        components: [{ id: 'root', component: 'Stat', title: 'CPU', value: { path: '/cpu' } }],
        data_model: { cpu: '72%' },
      });
      expect(result).toEqual({ valid: true, data: expect.any(Object) });
    });

    it('tolerates extra properties on components via passthrough', () => {
      const result = a2uiType.validate({
        ...validData,
        components: [{ id: 'root', component: 'Text', text: 'Hi', custom_prop: 'extra' }],
      });
      expect(result).toEqual({ valid: true, data: expect.any(Object) });
    });
  });

  describe('format', () => {
    it('returns a text representation with surface title', () => {
      const attachment = createAttachment(validData);
      const formatted = a2uiType.format(attachment, formatContext) as AgentFormattedAttachment;
      const representation = formatted.getRepresentation!();

      expect(representation.type).toBe('text');
      expect((representation as { value: string }).value).toContain('Test Surface');
    });

    it('includes component counts', () => {
      const attachment = createAttachment(validData);
      const formatted = a2uiType.format(attachment, formatContext) as AgentFormattedAttachment;
      const representation = formatted.getRepresentation!() as { value: string };

      expect(representation.value).toContain('Column: 1');
      expect(representation.value).toContain('Stat: 1');
      expect(representation.value).toContain('Text: 1');
    });

    it('falls back to surface_id when title is absent', () => {
      const { title: _, ...dataNoTitle } = validData;
      const attachment = createAttachment(dataNoTitle as A2UISurfaceAttachmentData);
      const formatted = a2uiType.format(attachment, formatContext) as AgentFormattedAttachment;
      const representation = formatted.getRepresentation!() as { value: string };

      expect(representation.value).toContain('test_surface');
    });
  });

  describe('getAgentDescription', () => {
    it('returns a comprehensive description referencing the tool', () => {
      const description = a2uiType.getAgentDescription!();
      expect(typeof description).toBe('string');
      expect(description).toContain(platformCoreTools.createA2UISurface);
      expect(description).toContain('root');
      expect(description).toContain('Text');
      expect(description).toContain('Stat');
      expect(description).toContain('Table');
      expect(description).toContain(KIBANA_EUI_CATALOG_ID);
    });
  });

  describe('getTools', () => {
    it('returns the create_a2ui_surface tool id', () => {
      expect(a2uiType.getTools!()).toEqual([platformCoreTools.createA2UISurface]);
    });
  });

  describe('isReadonly', () => {
    it('is false', () => {
      expect(a2uiType.isReadonly).toBe(false);
    });
  });
});
