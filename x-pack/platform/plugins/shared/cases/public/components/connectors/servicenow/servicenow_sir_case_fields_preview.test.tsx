/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { connector, choices } from '../mock';
import { useGetChoices } from './use_get_choices';
import FieldsPreview from './servicenow_sir_case_fields_preview';

import { renderWithTestingProviders } from '../../../common/mock';
import { tableMatchesExpectedContent } from '../../../common/test_utils';

jest.mock('./use_get_choices');

const useGetChoicesMock = useGetChoices as jest.Mock;

describe('ServiceNowITSM Fields: Preview', () => {
  const fields = {
    destIp: true,
    sourceIp: true,
    malwareHash: true,
    malwareUrl: true,
    priority: '2',
    category: 'Denial of Service',
    subcategory: '12',
    additionalFields: '{"foo": "bar"}',
  };

  beforeEach(() => {
    useGetChoicesMock.mockReturnValue({
      isLoading: false,
      isFetching: false,
      data: { data: choices },
    });
    jest.clearAllMocks();
  });

  it('renders all fields correctly', () => {
    renderWithTestingProviders(<FieldsPreview connector={connector} fields={fields} />);

    const rows = screen.getAllByTestId('card-list-item-row');
    const expectedContent = [
      ['Destination IPs', 'Yes'],
      ['Source IPs', 'Yes'],
      ['Malware URLs', 'Yes'],
      ['Malware Hashes', 'Yes'],
      ['Priority', '2 - High'],
      ['Category', 'Denial of Service'],
      ['Subcategory', 'Inbound or outbound'],
      ['foo', 'bar'],
    ];

    tableMatchesExpectedContent({ expectedContent, tableRows: rows });
  });
});
