/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { FormValues } from '../form/types';
import { AssembledQueriesControl } from './assembled_queries_control';

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({ value, dataTestSubj }: { value: string; dataTestSubj?: string }) => (
    <pre data-test-subj={dataTestSubj ?? 'mockCodeEditor'}>{value}</pre>
  ),
  ESQL_LANG_ID: 'esql',
}));

jest.mock('@kbn/esql-utils', () => ({
  prettifyQuery: (query: string) => query,
}));

const defaultValues = {
  kind: 'alert' as const,
  metadata: { name: 'Test', enabled: true },
  timeField: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { base: '', breach: { segment: '' } },
  stateTransitionAlertDelayMode: 'off' as const,
  stateTransitionRecoveryDelayMode: 'off' as const,
};

const Harness = ({
  query = defaultValues.query,
}: {
  query?: FormValues['query'];
}) => {
  const form = useForm<FormValues>({
    defaultValues: { ...defaultValues, query },
  });
  return (
    <IntlProvider locale="en">
      <FormProvider {...form}>
        <AssembledQueriesControl />
      </FormProvider>
    </IntlProvider>
  );
};

describe('AssembledQueriesControl', () => {
  it('renders How this works? with an info icon', () => {
    render(<Harness />);

    const button = screen.getByTestId('assembledQueriesOpen');
    expect(button).toHaveTextContent('How this works?');
    expect(button.querySelector('[data-euiicon-type="info"]')).toBeInTheDocument();
  });

  it('opens the modal with demo explainer when the query is incomplete', () => {
    render(<Harness />);

    fireEvent.click(screen.getByTestId('assembledQueriesOpen'));
    expect(screen.getByTestId('assembledQueriesModal')).toBeInTheDocument();
    expect(screen.getByTestId('assembledQueriesIncompleteHint')).toBeInTheDocument();
    expect(screen.getByTestId('assembledQueriesExplainerDemo')).toBeInTheDocument();
  });

  it('opens the modal with a live explainer when the base query is set', () => {
    render(
      <Harness
        query={{
          base: 'FROM logs-* | STATS c = COUNT(*)',
          breach: { segment: 'WHERE c > 5' },
        }}
      />
    );

    fireEvent.click(screen.getByTestId('assembledQueriesOpen'));
    expect(screen.getByTestId('assembledQueriesExplainer')).toBeInTheDocument();
    expect(screen.queryByTestId('assembledQueriesIncompleteHint')).not.toBeInTheDocument();
    expect(screen.getByTestId('queryPipelineActiveQuery')).toHaveTextContent('WHERE c > 5');
  });
});
