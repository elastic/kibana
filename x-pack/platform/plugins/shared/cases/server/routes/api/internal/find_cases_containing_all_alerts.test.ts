/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CasesClient } from '../../../client';
import { isStringOrArray, processCase } from './find_cases_containing_all_alerts';

describe('findCasesContainingAllAlerts', () => {
  describe('processCase', () => {
    it('returns null when required alert not found', async () => {
      const casesClient = {
        attachments: {
          getAllAlertsAttachToCase: jest.fn().mockResolvedValue([]),
        },
      } as unknown as CasesClient;

      const result = await processCase(casesClient, 'case-id', new Set(['alert-id']));
      expect(casesClient.attachments.getAllAlertsAttachToCase).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('returns case id when all alerts are present', async () => {
      const casesClient = {
        attachments: {
          getAllAlertsAttachToCase: jest.fn().mockResolvedValue([{ id: 'alert-id' }]),
        },
      } as unknown as CasesClient;

      const result = await processCase(casesClient, 'case-id', new Set(['alert-id']));
      expect(result).toBe('case-id');
      expect(casesClient.attachments.getAllAlertsAttachToCase).toHaveBeenCalledTimes(1);
      expect(casesClient.attachments.getAllAlertsAttachToCase).toHaveBeenCalledWith({
        caseId: 'case-id',
        filter: {
          arguments: [
            { isQuoted: false, type: 'literal', value: 'cases-comments.attributes.alertId' },
            { isQuoted: false, type: 'literal', value: 'alert-id' },
          ],
          function: 'is',
          type: 'function',
        },
      });
    });
  });

  describe('isStringOrArray', () => {
    it('returns true for a string', () => {
      expect(isStringOrArray('test')).toBe(true);
    });

    it('returns true for an array of strings', () => {
      expect(isStringOrArray(['test1', 'test2'])).toBe(true);
    });

    it('returns false for a number', () => {
      expect(isStringOrArray(123)).toBe(false);
    });

    it('returns false for an array of numbers', () => {
      expect(isStringOrArray([123, 456])).toBe(false);
    });

    it('returns false for an object', () => {
      expect(isStringOrArray({ key: 'value' })).toBe(false);
    });
  });
});
