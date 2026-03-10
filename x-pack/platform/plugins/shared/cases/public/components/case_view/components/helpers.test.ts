/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertComment, eventComment, basicCase, basicComment } from '../../../containers/mock';
import { getManualAlertIds, filterCaseAttachmentsBySearchTerm } from './helpers';

const comment = {
  ...alertComment,
  alertId: 'alert-id-1',
  index: '.alerts-matchme.alerts',
};
const comment2 = {
  ...alertComment,
  alertId: 'alert-id-2',
  index: '.alerts-another.alerts',
};

const comment3 = {
  ...alertComment,
  alertId: ['nested1', 'nested2', 'nested3'],
};

describe('Case view helpers', () => {
  describe('getManualAlertIds', () => {
    it('returns the alert ids', () => {
      const result = getManualAlertIds([comment, comment2]);
      expect(result).toEqual(['alert-id-1', 'alert-id-2']);
    });

    it('returns the alerts id from multiple alerts in a comment', () => {
      const result = getManualAlertIds([comment, comment2, comment3]);
      expect(result).toEqual(['alert-id-1', 'alert-id-2', 'nested1', 'nested2', 'nested3']);
    });
  });

  describe('filterCaseAttachmentsBySearchTerm', () => {
    it('returns the case data unchanged when search term is empty', () => {
      const caseData = {
        ...basicCase,
        comments: [alertComment, eventComment, basicComment],
      };
      const result = filterCaseAttachmentsBySearchTerm(caseData, '');
      expect(result).toBe(caseData);
      expect(result).toEqual(caseData);
    });

    it('filters out comments when no IDs match the search term', () => {
      const caseData = {
        ...basicCase,
        comments: [
          { ...alertComment, alertId: 'alert-123' },
          { ...eventComment, eventId: 'event-123' },
        ],
      };
      const result = filterCaseAttachmentsBySearchTerm(caseData, 'xyz');
      expect(result.comments).toHaveLength(0);
    });

    it('preserves non-alert and non-event comments', () => {
      const caseData = {
        ...basicCase,
        comments: [alertComment, eventComment, basicComment],
      };
      const result = filterCaseAttachmentsBySearchTerm(caseData, 'xyz');
      expect(result.comments).toHaveLength(1);
      expect(result.comments[0]).toEqual(basicComment);
    });

    it('filters mixed comment types correctly', () => {
      const caseData = {
        ...basicCase,
        comments: [
          { ...alertComment, alertId: 'alert-123' },
          { ...alertComment, alertId: 'alert-456' },
          { ...eventComment, eventId: 'event-123' },
          { ...eventComment, eventId: 'event-789' },
        ],
      };
      const result = filterCaseAttachmentsBySearchTerm(caseData, '123');
      expect(result.comments).toHaveLength(2);
      expect(result.comments[0]).toEqual({ ...alertComment, alertId: ['alert-123'] });
      expect(result.comments[1]).toEqual({ ...eventComment, eventId: ['event-123'] });
    });

    const testCases = [
      ['alert', 'alertId', alertComment] as const,
      ['event', 'eventId', eventComment] as const,
    ];

    testCases.forEach(([type, fieldName, commentTemplate]) => {
      it(`filters ${type} comments with single ${fieldName} that matches search term`, () => {
        const caseData = {
          ...basicCase,
          comments: [
            { ...commentTemplate, [fieldName]: `${type}-123` },
            { ...commentTemplate, [fieldName]: `${type}-456` },
          ],
        };
        const result = filterCaseAttachmentsBySearchTerm(caseData, '123');
        expect(result.comments).toHaveLength(1);
        expect(result.comments[0]).toEqual({
          ...commentTemplate,
          [fieldName]: [`${type}-123`],
        });
      });

      it(`filters ${type} comments with array ${fieldName} that matches search term`, () => {
        const caseData = {
          ...basicCase,
          comments: [
            { ...commentTemplate, [fieldName]: [`${type}-123`, `${type}-456`, `${type}-789`] },
            { ...commentTemplate, [fieldName]: [`${type}-abc`, `${type}-def`] },
          ],
        };
        const result = filterCaseAttachmentsBySearchTerm(caseData, '123');
        expect(result.comments).toHaveLength(1);
        expect(result.comments[0]).toEqual({
          ...commentTemplate,
          [fieldName]: [`${type}-123`],
        });
      });

      it(`filters multiple matching IDs in array ${fieldName}`, () => {
        const caseData = {
          ...basicCase,
          comments: [
            {
              ...commentTemplate,
              [fieldName]: [`${type}-123`, `${type}-123-abc`, `${type}-456`],
            },
          ],
        };
        const result = filterCaseAttachmentsBySearchTerm(caseData, '123');
        expect(result.comments).toHaveLength(1);
        expect(result.comments[0]).toEqual({
          ...commentTemplate,
          [fieldName]: [`${type}-123`, `${type}-123-abc`],
        });
      });

      it(`filters out ${type} comments with empty string ${fieldName}`, () => {
        const caseData = {
          ...basicCase,
          comments: [
            { ...commentTemplate, [fieldName]: '' },
            { ...commentTemplate, [fieldName]: `${type}-123` },
          ],
        };
        const result = filterCaseAttachmentsBySearchTerm(caseData, '123');
        expect(result.comments).toHaveLength(1);
        expect(result.comments[0]).toEqual({
          ...commentTemplate,
          [fieldName]: [`${type}-123`],
        });
      });

      it(`filters out ${type} comments with empty array ${fieldName}`, () => {
        const caseData = {
          ...basicCase,
          comments: [
            { ...commentTemplate, [fieldName]: [] },
            { ...commentTemplate, [fieldName]: `${type}-123` },
          ],
        };
        const result = filterCaseAttachmentsBySearchTerm(caseData, '123');
        expect(result.comments).toHaveLength(1);
        expect(result.comments[0]).toEqual({
          ...commentTemplate,
          [fieldName]: [`${type}-123`],
        });
      });

      it(`filters out empty strings from array ${fieldName} while keeping valid IDs`, () => {
        const caseData = {
          ...basicCase,
          comments: [
            {
              ...commentTemplate,
              [fieldName]: ['', `${type}-123`, '', `${type}-456`],
            },
          ],
        };
        const result = filterCaseAttachmentsBySearchTerm(caseData, '123');
        expect(result.comments).toHaveLength(1);
        expect(result.comments[0]).toEqual({
          ...commentTemplate,
          [fieldName]: [`${type}-123`],
        });
      });
    });
  });
});
