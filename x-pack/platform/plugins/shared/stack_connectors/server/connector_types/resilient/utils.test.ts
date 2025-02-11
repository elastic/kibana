/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatUpdateRequest, getValueTextContent } from './utils';

describe('utils', () => {
  describe('getValueTextContent', () => {
    test('transforms name correctly', () => {
      expect(getValueTextContent('name', 'title')).toEqual({
        text: 'title',
      });
    });

    test('transforms correctly the description', () => {
      expect(getValueTextContent('description', 'desc')).toEqual({
        textarea: {
          format: 'html',
          content: 'desc',
        },
      });
    });

    test('transforms correctly the severityCode', () => {
      expect(getValueTextContent('severityCode', 6)).toEqual({
        id: 6,
      });
    });

    test('transforms correctly the severityCode as string', () => {
      expect(getValueTextContent('severityCode', '6')).toEqual({
        id: 6,
      });
    });

    test('transforms correctly the incidentTypes', () => {
      expect(getValueTextContent('incidentTypes', [1101, 12])).toEqual({
        ids: [1101, 12],
      });
    });

    test('transforms default correctly', () => {
      expect(getValueTextContent('randomField', 'this is random')).toEqual({
        text: 'this is random',
      });
    });
  });

  describe('formatUpdateRequest', () => {
    test('transforms correctly', () => {
      const oldIncident = {
        name: 'title',
        description: { format: 'html', content: 'desc' },
        severity_code: '5',
        incident_type_ids: [12, 16],
      };
      const newIncident = {
        name: 'title_updated',
        description: 'desc_updated',
        severityCode: '6',
        incidentTypes: [12, 16, 1001],
      };
      expect(formatUpdateRequest({ oldIncident, newIncident })).toEqual({
        changes: [
          {
            field: { name: 'name' },
            old_value: { text: 'title' },
            new_value: { text: 'title_updated' },
          },
          {
            field: { name: 'description' },
            old_value: {
              textarea: {
                format: 'html',
                content: 'desc',
              },
            },
            new_value: {
              textarea: {
                format: 'html',
                content: 'desc_updated',
              },
            },
          },
          {
            field: { name: 'severity_code' },
            old_value: {
              id: 5,
            },
            new_value: { id: 6 },
          },
          {
            field: { name: 'incident_type_ids' },
            old_value: { ids: [12, 16] },
            new_value: {
              ids: [12, 16, 1001],
            },
          },
        ],
      });
    });
  });
});
