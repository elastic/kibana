/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CasesClient } from '../../../client';
import { processCase } from './find_cases_containing_all_documents';

describe('findCasesContainingAllDocuments', () => {
  describe('processCase', () => {
    const buildCasesClient = (
      overrides: {
        documents?: Array<{ id: string }>;
      } = {}
    ) =>
      ({
        attachments: {
          getAllDocumentsAttachedToCase: jest.fn().mockResolvedValue(overrides.documents ?? []),
        },
      } as unknown as CasesClient);

    it('returns null when required alert not found', async () => {
      const casesClient = buildCasesClient();

      const result = await processCase(casesClient, 'case-id', new Set(['alert-id']));
      expect(casesClient.attachments.getAllDocumentsAttachedToCase).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('returns case id when all alerts are present', async () => {
      const casesClient = buildCasesClient({ documents: [{ id: 'alert-id' }] });

      const result = await processCase(casesClient, 'case-id', new Set(['alert-id']));
      expect(result).toBe('case-id');
      expect(casesClient.attachments.getAllDocumentsAttachedToCase).toHaveBeenCalledTimes(1);
    });

    it('targets both cases-comments alert/event ids and cases-attachments attachmentId', async () => {
      const casesClient = buildCasesClient({ documents: [{ id: 'alert-id' }] });

      await processCase(casesClient, 'case-id', new Set(['alert-id']));

      const {
        calls: [params],
      } = jest.mocked(casesClient.attachments.getAllDocumentsAttachedToCase).mock;

      const filter = JSON.stringify(params[0].filter);
      expect(filter).toContain('cases-comments.attributes.alertId');
      expect(filter).toContain('cases-comments.attributes.eventId');
      expect(filter).toContain('cases-attachments.attributes.attachmentId');
      // type/owner restriction is handled by the attachment service, not the route
      expect(filter).not.toContain('cases-attachments.attributes.type');
    });
  });
});
