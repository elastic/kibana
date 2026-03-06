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
    it('returns null when required alert not found', async () => {
      const casesClient = {
        attachments: {
          getAllDocumentsAttachedToCase: jest.fn().mockResolvedValue([]),
        },
      } as unknown as CasesClient;

      const result = await processCase(casesClient, 'case-id', new Set(['alert-id']));
      expect(casesClient.attachments.getAllDocumentsAttachedToCase).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('returns case id when all alerts are present', async () => {
      const casesClient = {
        attachments: {
          getAllDocumentsAttachedToCase: jest.fn().mockResolvedValue([{ id: 'alert-id' }]),
        },
      } as unknown as CasesClient;

      const result = await processCase(casesClient, 'case-id', new Set(['alert-id']));
      expect(result).toBe('case-id');
      expect(casesClient.attachments.getAllDocumentsAttachedToCase).toHaveBeenCalledTimes(1);

      const {
        calls: [params],
      } = jest.mocked(casesClient.attachments.getAllDocumentsAttachedToCase).mock;

      expect(params).toMatchInlineSnapshot(`
        Array [
          Object {
            "caseId": "case-id",
            "filter": Object {
              "arguments": Array [
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "cases-comments.attributes.eventId",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "alert-id",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "cases-comments.attributes.alertId",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "alert-id",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
              ],
              "function": "or",
              "type": "function",
            },
          },
        ]
      `);
    });
  });
});
