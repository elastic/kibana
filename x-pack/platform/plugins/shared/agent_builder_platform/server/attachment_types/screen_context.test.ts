/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { ScreenContextAttachmentData } from '@kbn/agent-builder-common/attachments';
import { createScreenContextAttachmentType } from './screen_context';
import { renderSurface, surfaceContext } from './test_helpers';

const toComposition = (data: ScreenContextAttachmentData) =>
  createScreenContextAttachmentType().toSurfaceComposition?.(
    { id: 'screen-1', type: AttachmentType.screenContext, data },
    surfaceContext
  );

describe('screen_context attachment type', () => {
  describe('toSurfaceComposition', () => {
    it('shows what is set as fields', async () => {
      const composition = await toComposition({
        app: 'discover',
        url: '/app/discover#/',
        description: 'Logs of the checkout service',
        time_range: { from: 'now-15m', to: 'now' },
      });

      expect(composition).toEqual({
        type: 'view',
        title: 'Screen context',
        body: [
          {
            type: 'fields',
            items: [
              { label: 'App', value: 'discover' },
              { label: 'URL', value: '/app/discover#/' },
              { label: 'Description', value: 'Logs of the checkout service' },
              { label: 'Time range', value: 'now-15m to now' },
            ],
          },
        ],
      });
      expect((await renderSurface(composition)).valid).toBe(true);
    });

    it('shows additional data as fields, up to ten', async () => {
      const additionalData = Object.fromEntries(
        Array.from({ length: 12 }, (_, index) => [`key ${index}`, `value ${index}`])
      );
      const composition = await toComposition({ app: 'discover', additional_data: additionalData });
      const [fields] = composition?.body ?? [];

      expect(fields.type === 'fields' && fields.items).toHaveLength(10);
      expect(fields.type === 'fields' && fields.items[1]).toEqual({
        label: 'key 0',
        value: 'value 0',
      });
      expect((await renderSurface(composition)).valid).toBe(true);
    });

    it('says nothing was shared when nothing can be shown, and still renders', async () => {
      const composition = await toComposition({ additional_data: {} });

      expect(composition?.body).toEqual([
        { type: 'context', items: [{ text: 'No details of the screen were shared.' }] },
      ]);
      expect((await renderSurface(composition)).valid).toBe(true);
    });

    it('cuts long values, and still renders', async () => {
      const composition = await toComposition({ description: 'd'.repeat(5000) });
      const { valid, errors } = await renderSurface(composition);

      expect(errors).toEqual([]);
      expect(valid).toBe(true);
    });
  });
});
