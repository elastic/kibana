/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import {
  AttachmentType,
  type ScreenContextAttachmentData,
} from '@kbn/agent-builder-common/attachments';
import { createScreenContextAttachmentType } from './screen_context';

const toSurfaceComposition = async (data: ScreenContextAttachmentData) =>
  createScreenContextAttachmentType().toSurfaceComposition?.(
    { id: 'screen-context-1', type: AttachmentType.screenContext, data },
    { request: httpServerMock.createKibanaRequest(), spaceId: 'default' }
  );

describe('screen_context attachment type', () => {
  describe('toSurfaceComposition', () => {
    it('lists where the user is in Kibana', async () => {
      expect(
        await toSurfaceComposition({
          app: 'discover',
          url: 'https://kibana.example/app/discover',
          description: 'Viewing logs',
          time_range: { from: 'now-15m', to: 'now' },
        })
      ).toEqual({
        type: 'view',
        title: 'Screen context',
        body: [
          {
            type: 'markdown',
            text: [
              '- App: discover',
              '- URL: https://kibana.example/app/discover',
              '- Description: Viewing logs',
              '- Time range: now-15m to now',
            ].join('\n'),
          },
        ],
      });
    });

    it('leaves out the fields that are not set, and the additional data', async () => {
      expect(
        (await toSurfaceComposition({ app: 'discover', additional_data: { index: 'logs-*' } }))
          ?.body
      ).toEqual([{ type: 'markdown', text: '- App: discover' }]);
    });

    it('has an empty body when only additional data is set', async () => {
      expect((await toSurfaceComposition({ additional_data: { index: 'logs-*' } }))?.body).toEqual(
        []
      );
    });
  });
});
