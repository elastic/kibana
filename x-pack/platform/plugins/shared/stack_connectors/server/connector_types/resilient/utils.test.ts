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
        additionalFields: {
          // custom fields
          customField1: 'customValue1',
          test_text: 'some text',
          test_text_area: 'some textarea',
          test_boolean: true,
          test_number: 123,
          test_select: 'option1',
          test_multi_select: ['option1', 'option2'],
          test_date_picker: 943983345345,
          test_date_time_picker: 943983345345,
          // non custom field
          resolution_summary: 'some resolution summary',
        },
      };
      expect(
        formatUpdateRequest({
          oldIncident,
          newIncident,
          fields: resilientFields,
        })
      ).toEqual({
        changes: expect.arrayContaining([
          {
            field: {
              name: 'test_text',
            },
            new_value: {
              text: 'some text',
            },
            old_value: {},
          },
          {
            field: {
              name: 'test_text_area',
            },
            new_value: {
              textarea: {
                content: 'some textarea',
                format: 'text',
              },
            },
            old_value: {
              textarea: null,
            },
          },
          {
            field: {
              name: 'test_boolean',
            },
            new_value: {
              boolean: true,
            },
            old_value: {},
          },
          {
            field: {
              name: 'test_number',
            },
            new_value: {
              object: 123,
            },
            old_value: {},
          },
          {
            field: {
              name: 'test_select',
            },
            new_value: {
              id: 'option1',
            },
            old_value: {},
          },
          {
            field: {
              name: 'test_multi_select',
            },
            new_value: {
              ids: ['option1', 'option2'],
            },
            old_value: {},
          },
          {
            field: {
              name: 'test_date_picker',
            },
            new_value: {
              date: 943983345345,
            },
            old_value: {},
          },
          {
            field: {
              name: 'test_date_time_picker',
            },
            new_value: {
              date: 943983345345,
            },
            old_value: {},
          },
          {
            field: {
              name: 'resolution_summary',
            },
            new_value: {
              textarea: {
                content: 'some resolution summary',
                format: 'text',
              },
            },
            old_value: {
              textarea: null,
            },
          },
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
        ]),
      });
    });

    test('transforms updates to additionalFields correctly', () => {
      const oldIncident = {
        name: 'title',
        description: { format: 'html', content: 'desc' },
        severity_code: 5,
        incident_type_ids: [12, 16],
        // resolution_summary is not a custom field, so not part of `properties`
        resolution_summary: 'some resolution summary',
        properties: {
          customField1: 'oldCustomValue',
          test_text: 'some text',
          test_text_area: 'some textarea',
          test_boolean: true,
          test_number: 123,
          test_select: 'option1',
          test_multi_select: ['option1', 'option2'],
          test_date_picker: 943983345345,
          test_date_time_picker: 943983345345,
        },
      };
      const newIncident = {
        name: 'title_updated',
        description: 'desc_updated',
        severityCode: 6,
        incidentTypes: [12, 16, 1001],
        additionalFields: {
          customField1: 'customValue1',
          test_text: 'some new text',
          test_text_area: 'some new textarea',
          test_boolean: false,
          test_number: 1234,
          test_select: 'option2',
          test_multi_select: ['option3', 'option4'],
          test_date_picker: 1234567890123,
          test_date_time_picker: 1234567890123,
          resolution_summary: 'some new resolution summary',
        },
      };
      expect(
        formatUpdateRequest({
          oldIncident,
          newIncident,
          fields: resilientFields,
        })
      ).toEqual({
        changes: expect.arrayContaining([
          {
            field: {
              name: 'test_text',
            },
            new_value: {
              text: 'some new text',
            },
            old_value: {
              text: 'some text',
            },
          },
          {
            field: {
              name: 'test_text_area',
            },
            new_value: {
              textarea: {
                content: 'some new textarea',
                format: 'text',
              },
            },
            old_value: {
              textarea: {
                content: 'some textarea',
                format: 'text',
              },
            },
          },
          {
            field: {
              name: 'test_boolean',
            },
            new_value: {
              boolean: false,
            },
            old_value: {
              boolean: true,
            },
          },
          {
            field: {
              name: 'test_number',
            },
            new_value: {
              object: 1234,
            },
            old_value: {
              object: 123,
            },
          },
          {
            field: {
              name: 'test_select',
            },
            new_value: {
              id: 'option2',
            },
            old_value: {
              id: 'option1',
            },
          },
          {
            field: {
              name: 'test_multi_select',
            },
            new_value: {
              ids: ['option3', 'option4'],
            },
            old_value: {
              ids: ['option1', 'option2'],
            },
          },
          {
            field: {
              name: 'test_date_picker',
            },
            new_value: {
              date: 1234567890123,
            },
            old_value: {
              date: 943983345345,
            },
          },
          {
            field: {
              name: 'test_date_time_picker',
            },
            new_value: {
              date: 1234567890123,
            },
            old_value: {
              date: 943983345345,
            },
          },
          {
            field: {
              name: 'resolution_summary',
            },
            new_value: {
              textarea: {
                content: 'some new resolution summary',
                format: 'text',
              },
            },
            old_value: {
              textarea: {
                content: 'some resolution summary',
                format: 'text',
              },
            },
          },
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
        ]),
      });
    });
  });
});
