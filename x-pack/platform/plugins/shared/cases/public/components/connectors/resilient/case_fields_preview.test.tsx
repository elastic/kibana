/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { connector } from '../mock';
import { useGetIncidentTypes } from './use_get_incident_types';
import { useGetSeverity } from './use_get_severity';
import { useGetFields } from './use_get_fields';
import FieldsPreview from './case_fields_preview';

import { renderWithTestingProviders } from '../../../common/mock';
import { tableMatchesExpectedContent } from '../../../common/test_utils';
import { resilientFields } from './mocks';

jest.mock('../../../common/lib/kibana');
jest.mock('./use_get_incident_types');
jest.mock('./use_get_severity');
jest.mock('./use_get_fields');

const useGetIncidentTypesMock = useGetIncidentTypes as jest.Mock;
const useGetSeverityMock = useGetSeverity as jest.Mock;
const useGetFieldsMock = useGetFields as jest.Mock;

describe('Resilient Fields: Preview', () => {
  const useGetIncidentTypesResponse = {
    isLoading: false,
    isFetching: false,
    data: {
      data: [
        {
          id: 19,
          name: 'Malware',
        },
        {
          id: 21,
          name: 'Denial of Service',
        },
      ],
    },
  };

  const useGetSeverityResponse = {
    isLoading: false,
    isFetching: false,
    data: {
      data: [
        {
          id: 4,
          name: 'Low',
        },
        {
          id: 5,
          name: 'Medium',
        },
        {
          id: 6,
          name: 'High',
        },
      ],
    },
  };

  const useGetFieldsResponse = {
    isLoading: false,
    isFetching: false,
    data: {
      data: resilientFields,
    },
  };

  const fields = {
    incidentTypes: ['19', '21'],
    severityCode: '5',
    additionalFields: `{
      "unknown_field": "some value",
      "customField1": "customValue1",
      "test_text": "some text",
      "test_text_area": "some textarea",
      "test_boolean": false,
      "test_number": 1234,
      "test_select": 110,
      "test_multi_select": [
        120,
        130
      ],
      "test_date_picker": 1234567890123,
      "test_date_time_picker": 1234567890123,
      "resolution_summary": "some resolution summary"
    }`,
  };

  beforeEach(() => {
    useGetIncidentTypesMock.mockReturnValue(useGetIncidentTypesResponse);
    useGetSeverityMock.mockReturnValue(useGetSeverityResponse);
    useGetFieldsMock.mockReturnValue(useGetFieldsResponse);
    jest.clearAllMocks();
  });

  it('renders all fields correctly', () => {
    renderWithTestingProviders(<FieldsPreview connector={connector} fields={fields} />);

    const rows = screen.getAllByTestId('card-list-item-row');
    const expectedContent = [
      ['Incident types', 'Malware, Denial of Service'],
      ['Severity', 'Medium'],
      ['unknown_field', 'some value'],
      ['Custom Field 1', 'customValue1'],
      ['Test text', 'some text'],
      ['Test textarea', 'some textarea'],
      ['Test boolean', 'false'],
      ['Test number', '1234'],
      ['Test select', 'Option 2'],
      ['Test multiselect', 'Option 3, Option 4'],
      ['Test datepicker', 'February 13, 2009'],
      ['Test datetimepicker', 'February 13, 2009 @ 23:31:30'],
      ['Resolution summary', 'some resolution summary'],
    ];

    tableMatchesExpectedContent({ expectedContent, tableRows: rows });
  });
});
