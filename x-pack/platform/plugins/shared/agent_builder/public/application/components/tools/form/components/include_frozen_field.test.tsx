/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { FormProvider, useForm } from 'react-hook-form';
import { IncludeFrozenField } from './include_frozen_field';
import type { IncludeFrozenFormData } from '../types/tool_form_types';

const mockUseAgentBuilderServices = jest.fn();

jest.mock('../../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => mockUseAgentBuilderServices(),
}));

const TestWrapper = () => {
  const form = useForm<IncludeFrozenFormData>({ defaultValues: { includeFrozen: false } });

  return (
    <IntlProvider locale="en">
      <FormProvider {...form}>
        <IncludeFrozenField />
      </FormProvider>
    </IntlProvider>
  );
};

describe('IncludeFrozenField', () => {
  const checkboxTestSubj = 'agentBuilderToolIncludeFrozenCheckbox';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the include frozen checkbox outside serverless', () => {
    mockUseAgentBuilderServices.mockReturnValue({ isServerless: false });

    render(<TestWrapper />);

    expect(screen.getByTestId(checkboxTestSubj)).toBeInTheDocument();
  });

  it('does not render the include frozen checkbox in serverless', () => {
    mockUseAgentBuilderServices.mockReturnValue({ isServerless: true });

    render(<TestWrapper />);

    expect(screen.queryByTestId(checkboxTestSubj)).not.toBeInTheDocument();
  });
});
