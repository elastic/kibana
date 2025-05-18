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
import FieldsPreview from './servicenow_itsm_case_fields_preview';

import { renderWithTestingProviders } from '../../../common/mock';
import { createQueryWithMarkup } from '../../../common/test_utils';

jest.mock('./use_get_choices');

const useGetChoicesMock = useGetChoices as jest.Mock;

describe('ServiceNowITSM Fields: Preview', () => {
  const fields = {
    severity: '1',
    urgency: '2',
    impact: '3',
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

    const getByTextWithMarkup = createQueryWithMarkup(screen.getByText);

    expect(getByTextWithMarkup('Urgency: 2 - High')).toBeInTheDocument();
    expect(getByTextWithMarkup('Severity: 1 - Critical')).toBeInTheDocument();
    expect(getByTextWithMarkup('Impact: 3 - Moderate')).toBeInTheDocument();
    expect(getByTextWithMarkup('Category: Denial of Service')).toBeInTheDocument();
    expect(getByTextWithMarkup('Subcategory: Inbound or outbound')).toBeInTheDocument();
    expect(getByTextWithMarkup('Additional Fields:')).toBeInTheDocument();
    expect(getByTextWithMarkup('{"foo": "bar"}')).toBeInTheDocument();
  });
});
