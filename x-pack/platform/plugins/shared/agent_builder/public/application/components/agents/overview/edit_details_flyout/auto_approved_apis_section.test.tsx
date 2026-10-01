/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { FormProvider, useForm } from 'react-hook-form';
import type { AutoApprovedApisValue } from '../../../../utils/auto_approved_apis';
import { AutoApprovedApisSection } from './auto_approved_apis_section';
import type { EditDetailsFormData } from './types';

jest.mock('../../../../hooks/agents/use_api_selectors', () => ({
  useApiSelectors: () => ({
    selectorsByTarget: {
      elasticsearch: ['*', 'indices.*', 'indices.delete'],
      kibana: ['*'],
    },
    isLoading: false,
  }),
}));

const onSubmit = jest.fn();

interface TestFormProps {
  autoApprovedApis?: AutoApprovedApisValue;
  canEdit?: boolean;
}

const TestForm = ({ autoApprovedApis = {}, canEdit = true }: TestFormProps) => {
  const methods = useForm<EditDetailsFormData>({
    defaultValues: { configuration: { auto_approved_apis: autoApprovedApis } },
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <AutoApprovedApisSection canEdit={canEdit} />
        <button type="submit">submit</button>
      </form>
    </FormProvider>
  );
};

const renderSection = (props: TestFormProps = {}) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <TestForm {...props} />
      </IntlProvider>
    </EuiProvider>
  );

const elasticsearchInput = () =>
  within(screen.getByTestId('agentBuilderAutoApprovedApis-elasticsearch')).getByTestId(
    'comboBoxSearchInput'
  );

describe('AutoApprovedApisSection (edit details flyout)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits the picked APIs', async () => {
    renderSection();

    await userEvent.click(
      within(screen.getByTestId('agentBuilderAutoApprovedApis-elasticsearch')).getByTestId(
        'comboBoxToggleListButton'
      )
    );
    await userEvent.click(
      await screen.findByTestId('agentBuilderAutoApprovedApiOption-elasticsearch-indices.delete')
    );
    await userEvent.click(screen.getByText('submit'));

    expect(onSubmit.mock.calls[0][0].configuration.auto_approved_apis).toEqual({
      elasticsearch: ['indices.delete'],
      kibana: [],
    });
  });

  it('is editable when the user can manage the agent access control', () => {
    renderSection();

    expect(elasticsearchInput()).toBeEnabled();
  });

  it('is read-only with an explanation when the user cannot manage the agent access control', () => {
    renderSection({ canEdit: false, autoApprovedApis: { elasticsearch: ['indices.delete'] } });

    expect(elasticsearchInput()).toBeDisabled();
    expect(screen.getByTestId('agentBuilderAutoApprovedApisHelpText')).toHaveTextContent(
      'Only the owner, managers, or an administrator can change the auto-approved APIs.'
    );
  });
});
