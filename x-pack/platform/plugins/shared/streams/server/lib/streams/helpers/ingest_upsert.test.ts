/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStreamAttachmentIds } from './ingest_upsert';

describe('ingest_upsert', () => {
  describe('getStreamAttachmentIds', () => {
    it('partitions attachments into dashboard and rule ids', async () => {
      const attachmentClient = {
        getAttachments: jest.fn().mockResolvedValue([
          { type: 'dashboard', id: 'dashboard-1' },
          { type: 'rule', id: 'rule-1' },
          { type: 'dashboard', id: 'dashboard-2' },
          { type: 'rule', id: 'rule-2' },
        ]),
      };

      const result = await getStreamAttachmentIds({
        name: 'logs.otel',
        attachmentClient: attachmentClient as never,
      });

      expect(attachmentClient.getAttachments).toHaveBeenCalledWith('logs.otel');
      expect(result).toEqual({
        dashboards: ['dashboard-1', 'dashboard-2'],
        rules: ['rule-1', 'rule-2'],
      });
    });

    it('returns empty arrays when the stream has no attachments', async () => {
      const attachmentClient = { getAttachments: jest.fn().mockResolvedValue([]) };

      const result = await getStreamAttachmentIds({
        name: 'logs.otel',
        attachmentClient: attachmentClient as never,
      });

      expect(result).toEqual({ dashboards: [], rules: [] });
    });
  });
});
