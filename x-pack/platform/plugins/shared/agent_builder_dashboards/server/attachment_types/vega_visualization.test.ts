/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import {
  VEGA_VISUALIZATION_ATTACHMENT_TYPE,
  type VegaVisualizationAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { createVegaVisualizationAttachmentType } from './vega_visualization';

const validData: VegaVisualizationAttachmentData = {
  title: 'Top services',
  spec: {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    encoding: {},
  },
  dialect: 'vega-lite',
};

describe('createVegaVisualizationAttachmentType', () => {
  const definition = createVegaVisualizationAttachmentType();

  describe('validate', () => {
    it('accepts a well-formed payload', async () => {
      const result = await definition.validate(validData);
      expect(result).toEqual({ valid: true, data: validData });
    });

    it('rejects an empty title', async () => {
      const result = await definition.validate({ ...validData, title: '' });
      expect(result.valid).toBe(false);
    });

    it('rejects an unknown dialect', async () => {
      const result = await definition.validate({ ...validData, dialect: 'd3' as unknown });
      expect(result.valid).toBe(false);
    });

    it('rejects when spec is not an object', async () => {
      const result = await definition.validate({
        ...validData,
        spec: 'not an object' as unknown,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('format.getRepresentation', () => {
    const makeAttachment = (
      data: VegaVisualizationAttachmentData
    ): Attachment<typeof VEGA_VISUALIZATION_ATTACHMENT_TYPE, VegaVisualizationAttachmentData> => ({
      id: 'att-1',
      type: VEGA_VISUALIZATION_ATTACHMENT_TYPE,
      data,
    });

    it('includes title, dialect and attachment id', async () => {
      const representation = await definition.format(makeAttachment(validData), {
        request: {} as never,
        spaceId: 'default',
      });
      const text = await representation.getRepresentation?.();
      expect(text).toEqual({
        type: 'text',
        value: 'Vega-Lite "Top services" (attachment.id: "att-1")',
      });
    });

    it('includes the mark type when present (string mark)', async () => {
      const representation = await definition.format(
        makeAttachment({
          ...validData,
          spec: { ...validData.spec, mark: 'bar' },
        }),
        { request: {} as never, spaceId: 'default' }
      );
      const text = await representation.getRepresentation?.();
      expect(text).toEqual({
        type: 'text',
        value: 'Vega-Lite "Top services" (attachment.id: "att-1"), mark: bar',
      });
    });

    it('includes the mark type when present (object mark)', async () => {
      const representation = await definition.format(
        makeAttachment({
          ...validData,
          spec: { ...validData.spec, mark: { type: 'rect' } },
        }),
        { request: {} as never, spaceId: 'default' }
      );
      const text = await representation.getRepresentation?.();
      expect(text).toEqual({
        type: 'text',
        value: 'Vega-Lite "Top services" (attachment.id: "att-1"), mark: rect',
      });
    });

    it('labels full Vega specs as "Vega"', async () => {
      const representation = await definition.format(
        makeAttachment({ ...validData, dialect: 'vega' }),
        { request: {} as never, spaceId: 'default' }
      );
      const text = await representation.getRepresentation?.();
      expect(text?.value).toMatch(/^Vega "/);
    });
  });

  it('exposes no bound tools', () => {
    expect(definition.getTools?.()).toEqual([]);
  });

  it('returns an agent description that references the tool and dashboard flow', () => {
    const description = definition.getAgentDescription?.();
    expect(description).toContain('platform.dashboard.create_vega_visualization');
    expect(description).toContain('platform.dashboard.manage_dashboard');
  });
});
