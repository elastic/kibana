/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatUpdateRequest } from './utils';
import { resilientFields } from './mocks';

describe('utils', () => {
  describe('formatUpdateRequest', () => {
    test('transforms correctly', () => {
      const oldIncident = {
        name: 'title',
        description: { format: 'html', content: 'desc' },
        severity_code: 5,
        incident_type_ids: [12, 16],
      };
      const newIncident = {
        name: 'title_updated',
        description: 'desc_updated',
        severityCode: 6,
        incidentTypes: [12, 16, 1001],
        additionalFields: { customField1: 'customValue1' },
      };
      expect(
        formatUpdateRequest({
          oldIncident,
          newIncident,
          fields: resilientFields,
        })
      ).toEqual({
        changes: [
          {
            field: { name: 'customField1' },
            old_value: {},
            new_value: { text: 'customValue1' },
          },
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

    test('transforms updates to additionalFields correctly', () => {
      const oldIncident = {
        name: 'title',
        description: { format: 'html', content: 'desc' },
        severity_code: 5,
        incident_type_ids: [12, 16],
        properties: { customField1: 'oldCustomValue' },
      };
      const newIncident = {
        name: 'title_updated',
        description: 'desc_updated',
        severityCode: 6,
        incidentTypes: [12, 16, 1001],
        additionalFields: { customField1: 'customValue1' },
      };
      expect(
        formatUpdateRequest({
          oldIncident,
          newIncident,
          fields: resilientFields,
        })
      ).toEqual({
        changes: [
          {
            field: { name: 'customField1' },
            old_value: { text: 'oldCustomValue' },
            new_value: { text: 'customValue1' },
          },
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
