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
import { KibanaServices } from '../../../common/lib/kibana';
import { useGetSeverity } from './use_get_severity';
import { useGetFields } from './use_get_fields';
import FieldsPreview from './case_fields_preview';

import { renderWithTestingProviders } from '../../../common/mock';
import { createQueryWithMarkup } from '../../../common/test_utils';
import { resilientFields } from './mocks';

jest.mock('../../../common/lib/kibana');
jest.mock('./use_get_incident_types');
jest.mock('./use_get_severity');
jest.mock('./use_get_fields');

const getConfigMock = KibanaServices.getConfig as jest.Mock;
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
    additionalFields: '{"test_text":"testValue"}',
  };

  beforeEach(() => {
    getConfigMock.mockReturnValue({
      resilient: {
        additionalFields: {
          enabled: true,
        },
      },
    });
    useGetIncidentTypesMock.mockReturnValue(useGetIncidentTypesResponse);
    useGetSeverityMock.mockReturnValue(useGetSeverityResponse);
    useGetFieldsMock.mockReturnValue(useGetFieldsResponse);
    jest.clearAllMocks();
  });

  it('renders all fields correctly', () => {
    renderWithTestingProviders(<FieldsPreview connector={connector} fields={fields} />);

    const getByTextWithMarkup = createQueryWithMarkup(screen.getByText);

    expect(getByTextWithMarkup('Incident types: Malware, Denial of Service')).toBeInTheDocument();
    expect(getByTextWithMarkup('Severity: Medium')).toBeInTheDocument();
    expect(getByTextWithMarkup('Test text: testValue')).toBeInTheDocument();
  });

  it('hides the additional fields when it is disabled', async () => {
    getConfigMock.mockReturnValue({
      resilient: {
        additionalFields: {
          enabled: false,
        },
      },
    });

    renderWithTestingProviders(<FieldsPreview connector={connector} fields={fields} />);
    expect(screen.queryByText('Test text: testValue')).not.toBeInTheDocument();
  });
});
