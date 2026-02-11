/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { createMemoryHistory } from 'history';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { act } from 'react-dom/test-utils';
import { EsDeprecations } from '../../../public/application/components';
import { WithAppDependencies } from '../helpers/setup_environment';

export const setupElasticsearchPage = async (
  httpSetup: HttpSetup,
  overrides?: Record<string, unknown>
): Promise<void> => {
  const EsDeprecationsWithDependencies = WithAppDependencies(EsDeprecations, httpSetup, overrides);
  const history = createMemoryHistory({ initialEntries: ['/es_deprecations'] });

  renderWithI18n(
    <Router history={history}>
      <Routes>
        <Route exact path="/es_deprecations" component={EsDeprecationsWithDependencies} />
      </Routes>
    </Router>
  );

  // In suites that opt into fake timers, some mount-time requests resolve via timers.
  // Flush pending timers inside act() so their React state updates are correctly wrapped.
  if (jest.isMockFunction(setTimeout) && jest.getTimerCount() > 0) {
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
  }

  // Wait for the initial render baseline (mount-time requests/async state).
  await waitFor(() => {
    const settledElement =
      screen.queryByTestId('esDeprecationsContent') ??
      screen.queryByTestId('noDeprecationsPrompt') ??
      screen.queryByTestId('deprecationsPageLoadingError');

    expect(settledElement).not.toBeNull();
  });

  // Some providers start in LoadingState.Loading and then resolve status asynchronously.
  // If "Loading status…" is present, wait for it to disappear so those mount-time state updates
  // happen while RTL is actively awaiting a UI boundary (prevents act warnings).
  const hasLoadingStatus = screen.queryAllByText('Loading status…').length > 0;
  if (hasLoadingStatus) {
    await waitFor(() => {
      expect(screen.queryAllByText('Loading status…')).toHaveLength(0);
    });
  }

  // Some rows fetch "status" asynchronously on mount (IndexStatusProvider/DataStreamMigrationStatusProvider).
  // Wait for table rows to exist first, then wait for the visible boundary that indicates those
  // mount-time async updates have settled (prevents React act() warnings).
  const hasTable = screen.queryByTestId('esDeprecationsContent') !== null;
  if (hasTable) {
    await screen.findAllByTestId('deprecationTableRow');
    await waitFor(() => {
      const indexResolutionCells = screen.queryAllByTestId('reindexTableCell-correctiveAction');
      const dataStreamResolutionCells = screen.queryAllByTestId(
        'dataStreamReindexTableCell-correctiveAction'
      );

      const resolutionCells = [...indexResolutionCells, ...dataStreamResolutionCells];

      // If there are no resolution cells on the page, there's nothing to wait for.
      if (resolutionCells.length === 0) {
        return;
      }

      // Ensure async status providers have settled (no "Loading status…" placeholders remaining).
      for (const cell of resolutionCells) {
        expect(cell).not.toHaveTextContent('Loading status…');
      }
    });
  }
};
