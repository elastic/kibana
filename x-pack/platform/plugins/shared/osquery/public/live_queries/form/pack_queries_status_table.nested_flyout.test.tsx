/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EuiFlyout, EuiProvider, getFlyoutManagerStore } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { noop } from 'lodash';

import { PackQueriesStatusTable } from './pack_queries_status_table';
import { useErrorToast } from '../../common/hooks/use_error_toast';

// Kibana's Jest resolver uses EUI's test-env flyout stub, which omits session management.
jest.mock('@elastic/eui', () =>
  jest.requireActual(
    require.resolve('@elastic/eui/package.json').replace('package.json', 'lib/index.js')
  )
);
jest.mock('../../common/hooks/use_error_toast');
jest.mock('../../results/export_filters_context', () => {
  const actual = jest.requireActual('../../results/export_filters_context');

  return {
    ...actual,
    useExportFiltersContext: jest.fn(actual.useExportFiltersContext),
  };
});
jest.mock('../../routes/saved_queries/edit/tabs', () => ({
  ResultTabs: () => <div data-test-subj="mock-result-tabs" />,
}));
jest.mock('./pack_results_header', () => ({
  PackResultsHeader: () => null,
}));
jest.mock('../../lens/pack_view_in_lens', () => ({
  PackViewInLensAction: () => null,
}));
jest.mock('../../discover/pack_view_in_discover', () => ({
  PackViewInDiscoverAction: () => null,
}));
jest.mock('../../actions/components/tags_column', () => ({
  TagsColumn: () => null,
}));
jest.mock('./row_kebab_menu', () => ({
  RowKebabMenu: () => null,
}));

const renderInResponse = (size: 'm' | 'l' = 'm') =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <EuiFlyout session="start" size={size} aria-label="Response" onClose={noop}>
          <PackQueriesStatusTable
            actionId="a1"
            agentIds={['agent-1']}
            data={[
              {
                id: 'q1',
                action_id: 'a1',
                query: 'select 1;',
                agents: ['agent-1'],
                docs: 1,
                status: 'completed',
                pending: 0,
              },
            ]}
          />
        </EuiFlyout>
      </IntlProvider>
    </EuiProvider>
  );

describe('PackQueriesStatusTable inside a managed flyout', () => {
  const setErrorToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useErrorToast).mockReturnValue(setErrorToast);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens View query in a managed size m Response without unmounting the results', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error');
    renderInResponse();
    const table = screen.getByRole('table');
    const row = screen.getByRole('row', { name: /q1/ });

    fireEvent.click(within(row).getByRole('button', { name: 'View query' }));

    const details = screen.getByTestId('osquery-query-details-flyout');
    expect(within(details).getByText('q1')).toBeVisible();
    expect(details).toHaveTextContent('select 1;');
    expect(table).toBeInTheDocument();
    expect(row).toBeInTheDocument();
    expect(getFlyoutManagerStore().getState().flyouts).toEqual(
      expect.arrayContaining([expect.objectContaining({ level: 'child', size: 's' })])
    );
    expect(setErrorToast).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('cleans up a registered child after a contained EUI size validation failure', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // EUI permits an l parent alone, but rejects it once the s child registers.
    renderInResponse('l');
    const parent = screen.getByRole('dialog', { name: 'Response' });
    const table = screen.getByRole('table');
    const row = screen.getByRole('row', { name: /q1/ });

    fireEvent.click(within(row).getByRole('button', { name: 'View query' }));

    expect(setErrorToast).toHaveBeenCalledTimes(1);
    expect(setErrorToast).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'EuiFlyout validation error: Flyouts cannot be size "l" unless the other flyout is "fill"',
      }),
      { title: 'Unable to show query details' }
    );
    expect(screen.queryByTestId('osquery-query-details-flyout')).not.toBeInTheDocument();
    expect(parent).toBeInTheDocument();
    expect(table).toBeInTheDocument();
    expect(row).toBeInTheDocument();
    const { sessions, flyouts } = getFlyoutManagerStore().getState();
    expect(sessions).toEqual([expect.objectContaining({ childFlyoutId: null })]);
    expect(flyouts).toEqual([expect.objectContaining({ level: 'main' })]);
  });
});
