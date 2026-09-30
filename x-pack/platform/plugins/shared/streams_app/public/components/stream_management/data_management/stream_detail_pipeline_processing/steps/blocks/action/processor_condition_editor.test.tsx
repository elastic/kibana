/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { UseFormReturn } from 'react-hook-form';
import { FormProvider, useForm } from 'react-hook-form';
import { ProcessorConditionEditor } from './processor_condition_editor';

jest.mock('../../../../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: {
      docLinks: {
        links: {
          ingest: {
            conditionalProcessor: 'https://elastic.co/docs/conditionally-run-processor',
          },
        },
      },
    },
  }),
}));

interface ConditionFormValues {
  action: string;
  if?: string | { source: string; params?: Record<string, string> };
}

const TestForm = ({
  defaultValues,
  onReady,
}: {
  defaultValues: ConditionFormValues;
  onReady?: (methods: UseFormReturn<ConditionFormValues>) => void;
}) => {
  const methods = useForm<ConditionFormValues>({ defaultValues });
  onReady?.(methods);

  return (
    <I18nProvider>
      <FormProvider {...methods}>
        <ProcessorConditionEditor />
      </FormProvider>
    </I18nProvider>
  );
};

describe('ProcessorConditionEditor', () => {
  it('renders the existing freetext condition', () => {
    render(<TestForm defaultValues={{ action: 'set', if: "ctx.level == 'debug'" }} />);

    expect(screen.getByTestId('streamsAppProcessorConditionField')).toHaveValue(
      "ctx.level == 'debug'"
    );
    expect(screen.getByText('Condition (optional)')).toBeInTheDocument();
  });

  it('renders an empty text box when no condition is set', () => {
    render(<TestForm defaultValues={{ action: 'set' }} />);

    expect(screen.getByTestId('streamsAppProcessorConditionField')).toHaveValue('');
  });

  it('does not render for script object conditions', () => {
    render(
      <TestForm
        defaultValues={{
          action: 'set',
          if: { source: 'ctx.level == params.level', params: { level: 'debug' } },
        }}
      />
    );

    expect(screen.queryByTestId('streamsAppProcessorConditionField')).not.toBeInTheDocument();
  });

  it('writes the typed condition to the `if` form value', async () => {
    let methods: UseFormReturn<ConditionFormValues> | undefined;
    render(
      <TestForm
        defaultValues={{ action: 'set' }}
        onReady={(formMethods) => {
          methods = formMethods;
        }}
      />
    );

    await userEvent.type(
      screen.getByTestId('streamsAppProcessorConditionField'),
      "ctx.level == 'debug'"
    );

    expect(methods?.getValues('if')).toBe("ctx.level == 'debug'");
  });

  it('accepts multi-line conditions', async () => {
    let methods: UseFormReturn<ConditionFormValues> | undefined;
    render(
      <TestForm
        defaultValues={{ action: 'set' }}
        onReady={(formMethods) => {
          methods = formMethods;
        }}
      />
    );

    const field = screen.getByTestId('streamsAppProcessorConditionField');
    expect(field.tagName).toBe('TEXTAREA');
    expect(field).toHaveAttribute('rows', '3');

    await userEvent.type(
      field,
      "ctx.level == 'debug'{enter}&& ctx.service != null{enter}&& ctx.host != null"
    );

    expect(methods?.getValues('if')).toBe(
      "ctx.level == 'debug'\n&& ctx.service != null\n&& ctx.host != null"
    );
  });
});
