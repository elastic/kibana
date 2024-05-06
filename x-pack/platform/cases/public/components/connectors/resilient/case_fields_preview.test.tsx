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
import FieldsPreview from './case_fields_preview';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { createQueryWithMarkup } from '../../../common/test_utils';

jest.mock('../../../common/lib/kibana');
jest.mock('./use_get_incident_types');
jest.mock('./use_get_severity');

const useGetIncidentTypesMock = useGetIncidentTypes as jest.Mock;
const useGetSeverityMock = useGetSeverity as jest.Mock;

describe('Jira Fields: Preview', () => {
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

  const fields = {
    incidentTypes: ['19', '21'],
    severityCode: '5',
  };

  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
    useGetIncidentTypesMock.mockReturnValue(useGetIncidentTypesResponse);
    useGetSeverityMock.mockReturnValue(useGetSeverityResponse);
    jest.clearAllMocks();
  });

  it('renders all fields correctly', () => {
    appMockRenderer.render(<FieldsPreview connector={connector} fields={fields} />);

    const getByText = createQueryWithMarkup(screen.getByText);

    expect(getByText('Incident types: Malware, Denial of Service')).toBeInTheDocument();
    expect(getByText('Severity: Medium')).toBeInTheDocument();
  });
});
