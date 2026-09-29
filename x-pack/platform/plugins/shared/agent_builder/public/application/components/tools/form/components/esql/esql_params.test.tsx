/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { FormProvider, useForm } from 'react-hook-form';
import { EsqlToolFieldType, ToolType } from '@kbn/agent-builder-common';
import { EsqlParams } from './esql_params';
import type { EsqlToolFormData } from '../../types/tool_form_types';
import { EsqlParamSource } from '../../types/tool_form_types';

const mockUseKibana = vi.fn();
const mockUseEsqlEditorParams = vi.fn();
const mockUseEsqlParamsValidation = vi.fn();

vi.mock('../../../../../hooks/use_kibana', () => {
      const mocked = {
      useKibana: () => mockUseKibana(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../hooks/use_esql_editor_params', () => {
      const mocked = {
      useEsqlEditorParams: (props: any) => mockUseEsqlEditorParams(props),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../hooks/use_esql_params_validation', () => {
      const mocked = {
      useEsqlParamsValidation: () => mockUseEsqlParamsValidation(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./esql_param_row', () => {
      const mocked = {
      EsqlParamRow: ({ paramField }: { paramField: any }) => (
        <div data-test-subj={`esql-param-row-${paramField.name}`}>{paramField.name}</div>
      ),
    };
      return { ...mocked, default: mocked };
    });

describe('EsqlParams - Array Type Warning', () => {
  const warningMessage = /in your ES\|QL query to filter by array type parameters/i;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        docLinks: {
          links: {
            query: {
              queryESQLMultiValueControls: 'http://test.com',
            },
          },
        },
      },
    });
    mockUseEsqlEditorParams.mockReturnValue(undefined);
    mockUseEsqlParamsValidation.mockReturnValue({
      triggerEsqlParamWarnings: vi.fn(),
      triggerEsqlParamFieldsValidation: vi.fn(),
    });
  });

  const TestWrapper: React.FC<{ params: EsqlToolFormData['params'] }> = ({ params }) => {
    const form = useForm<EsqlToolFormData>({
      defaultValues: {
        toolId: 'test-tool',
        description: '',
        labels: [],
        type: ToolType.esql,
        esql: '',
        params,
      },
      mode: 'onBlur',
    });

    return (
      <IntlProvider locale="en">
        <FormProvider {...form}>
          <EsqlParams />
        </FormProvider>
      </IntlProvider>
    );
  };

  const renderComponent = (params: EsqlToolFormData['params']) => {
    return render(<TestWrapper params={params} />);
  };

  it('displays array warning when at least one parameter has ARRAY type', () => {
    const params = [
      {
        name: 'tags',
        description: 'Tags parameter',
        type: EsqlToolFieldType.ARRAY,
        optional: false,
        source: EsqlParamSource.Custom,
      },
      {
        name: 'name',
        description: 'Name parameter',
        type: EsqlToolFieldType.STRING,
        optional: false,
        source: EsqlParamSource.Custom,
      },
    ];

    renderComponent(params);

    expect(screen.getByText(warningMessage)).toBeInTheDocument();

    const mvContainsLink = screen.getByRole('link', { name: /MV_CONTAINS/i });
    expect(mvContainsLink).toBeInTheDocument();
  });

  it('does not display array warning when no parameters have ARRAY type', () => {
    const params = [
      {
        name: 'name',
        description: 'Name parameter',
        type: EsqlToolFieldType.STRING,
        optional: false,
        source: EsqlParamSource.Custom,
      },
      {
        name: 'age',
        description: 'Age parameter',
        type: EsqlToolFieldType.INTEGER,
        optional: false,
        source: EsqlParamSource.Custom,
      },
    ];

    renderComponent(params);

    expect(screen.queryByText(warningMessage)).not.toBeInTheDocument();
  });

  it('does not display array warning when params array is empty', () => {
    renderComponent([]);

    expect(screen.queryByText(/You must use/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/MV_CONTAINS/i)).not.toBeInTheDocument();
  });
});
