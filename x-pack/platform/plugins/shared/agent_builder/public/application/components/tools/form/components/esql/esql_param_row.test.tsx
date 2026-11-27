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
import { EsqlToolFieldType, ToolType } from '@kbn/agent-builder-common';
import { EuiTable, EuiTableBody } from '@elastic/eui';
import { EsqlParamRow } from './esql_param_row';
import type { EsqlToolFormData } from '../../types/tool_form_types';
import { EsqlParamSource } from '../../types/tool_form_types';

jest.mock('../../hooks/use_esql_params_validation', () => ({
  useEsqlParamsValidation: () => ({
    triggerEsqlParamWarnings: jest.fn(),
    triggerEsqlParamFieldsValidation: jest.fn(),
  }),
}));

const param = {
  name: 'name',
  description: 'Name parameter',
  type: EsqlToolFieldType.STRING,
  optional: false,
  source: EsqlParamSource.Custom,
};

const TestWrapper: React.FC = () => {
  const form = useForm<EsqlToolFormData>({
    defaultValues: {
      toolId: 'test-tool',
      description: '',
      labels: [],
      type: ToolType.esql,
      esql: '',
      params: [param],
    },
  });

  return (
    <IntlProvider locale="en">
      <FormProvider {...form}>
        <EuiTable>
          <EuiTableBody>
            <EsqlParamRow
              index={0}
              paramField={{ ...param, id: 'field-id' }}
              removeParamField={jest.fn()}
            />
          </EuiTableBody>
        </EuiTable>
      </FormProvider>
    </IntlProvider>
  );
};

describe('EsqlParamRow', () => {
  it('gives the optional checkbox an accessible name', () => {
    render(<TestWrapper />);

    expect(screen.getByRole('checkbox', { name: 'Optional' })).toBeInTheDocument();
  });
});
