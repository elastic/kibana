/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import * as fixtures from '../../__fixtures__';
import { getRandomString } from '@kbn/test-jest-helpers';
import { API_BASE_PATH } from '../../common/constants';
import type { HttpSetup } from '@kbn/core/public';
import { WatchListPage } from '../../public/application/sections/watch_list_page/watch_list_page';
import { setupEnvironment, WithAppDependencies } from './helpers/setup_environment';
import { REFRESH_INTERVALS } from '../../common/constants';

const renderWatchListPage = (httpSetup: HttpSetup) => {
  const Wrapped = WithAppDependencies(WatchListPage, httpSetup);
  render(
    <I18nProvider>
      <Wrapped />
    </I18nProvider>
  );
};

describe('<WatchListPage />', () => {
  let httpSetup: HttpSetup;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(async () => {
    // Suite hygiene for fake timers
    if (jest.getTimerCount() > 0) {
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    }
    jest.clearAllTimers();
  });

  describe('on component mount', () => {
    describe('watches', () => {
      describe('when there are no watches', () => {
        beforeEach(async () => {
          ({ httpSetup, httpRequestsMockHelpers } = setupEnvironment());
          httpRequestsMockHelpers.setLoadWatchesResponse({ watches: [] });

          renderWatchListPage(httpSetup);
          await screen.findByTestId('emptyPrompt');
        });

        test('should display an empty prompt', async () => {
          expect(screen.getByTestId('emptyPrompt')).toBeInTheDocument();
          expect(screen.getByTestId('createWatchButton')).toBeInTheDocument();
        });
      });

      // create a threshold and advanced watch type and monitoring
      describe('when there are watches', () => {
        const watch1 = fixtures.getWatch({
          name: `watchA-${getRandomString()}`,
          id: `a-${getRandomString()}`,
          type: 'threshold',
        });
        const watch2 = fixtures.getWatch({
          name: `watchB-${getRandomString()}`,
          id: `b-${getRandomString()}`,
          type: 'json',
        });
        const watch3 = fixtures.getWatch({
          name: `watchC-${getRandomString()}`,
          id: `c-${getRandomString()}`,
          type: 'monitoring',
          isSystemWatch: true,
        });

        const watches = [watch1, watch2, watch3];

        beforeEach(async () => {
          ({ httpSetup, httpRequestsMockHelpers } = setupEnvironment());
          httpRequestsMockHelpers.setLoadWatchesResponse({ watches });

          renderWatchListPage(httpSetup);
          await screen.findByTestId('watchesTable');
        });

        test('should show error callout if search is invalid', async () => {
          const container = screen.getByTestId('watchesTableContainer');
          const searchInput = within(container).getByRole('searchbox');

          fireEvent.change(searchInput, { target: { value: 'or' } });
          fireEvent.keyUp(searchInput, { key: 'Enter', keyCode: 13, which: 13 });

          expect(await screen.findByTestId('watcherListSearchError')).toBeInTheDocument();
        });

        test('should retain the search query', async () => {
          const container = screen.getByTestId('watchesTableContainer');
          const searchInput = within(container).getByRole('searchbox');

          fireEvent.change(searchInput, { target: { value: watch1.name } });
          fireEvent.keyUp(searchInput, { key: 'Enter', keyCode: 13, which: 13 });

          await waitFor(() => {
            expect(screen.getAllByTestId('row')).toHaveLength(1);
          });

          expect(screen.getByTestId(`watchIdColumn-${watch1.id}`)).toBeInTheDocument();
          expect(screen.getByTestId(`watchNameColumn-${watch1.id}`)).toHaveTextContent(watch1.name);

          await act(async () => {
            await jest.advanceTimersByTimeAsync(REFRESH_INTERVALS.WATCH_LIST);
          });

          await waitFor(() => {
            expect(screen.getAllByTestId('row')).toHaveLength(1);
          });
          expect(screen.getByTestId(`watchIdColumn-${watch1.id}`)).toBeInTheDocument();
          expect(screen.getByTestId(`watchNameColumn-${watch1.id}`)).toHaveTextContent(watch1.name);
        });

        test('should set the correct app title', () => {
          expect(screen.getByTestId('appTitle')).toHaveTextContent('Watcher');
        });

        test('should have a link to the documentation', () => {
          expect(screen.getByTestId('documentationLink')).toHaveTextContent('Watcher docs');
        });

        test('should list them in the table', async () => {
          const rows = screen.getAllByTestId('row');
          expect(rows).toHaveLength(3);

          rows.forEach((rowEl, i) => {
            const watch = watches[i];
            expect(within(rowEl).getByTestId(`watchIdColumn-${watch.id}`)).toBeInTheDocument();
            expect(within(rowEl).getByTestId(`watchNameColumn-${watch.id}`)).toHaveTextContent(
              watch.name ?? ''
            );
          });
        });

        test('should have a button to create a watch', () => {
          expect(screen.getByTestId('createWatchButton')).toBeInTheDocument();
        });

        test('should have a link to view watch details', () => {
          expect(screen.getByTestId(`watchIdColumn-${watch1.id}`)).toHaveAttribute(
            'href',
            `/watches/watch/${watch1.id}/status`
          );
        });

        test('should have action buttons on each row to edit and delete a watch', () => {
          const rows = screen.getAllByTestId('row');
          const firstRow = rows[0];

          expect(within(firstRow).getByTestId('editWatchButton')).toBeInTheDocument();
          expect(within(firstRow).getByTestId('deleteWatchButton')).toBeInTheDocument();
        });

        describe('system watch', () => {
          test('should disable edit and delete actions', async () => {
            const rows = screen.getAllByTestId('row');
            const systemRow = rows[2];
            const editButton = within(systemRow).getByTestId('editWatchButton');
            const deleteButton = within(systemRow).getByTestId('deleteWatchButton');

            expect(editButton).toBeDisabled();
            expect(deleteButton).toBeDisabled();
          });
        });

        describe('delete watch', () => {
          test('should show a confirmation when clicking the delete watch button', async () => {
            const rows = screen.getAllByTestId('row');
            fireEvent.click(within(rows[0]).getByTestId('deleteWatchButton'));

            const modal = await screen.findByTestId('deleteWatchesConfirmation');
            expect(modal).toHaveTextContent('Delete watch');
          });

          test('should send the correct HTTP request to delete watch', async () => {
            const rows = screen.getAllByTestId('row');
            fireEvent.click(within(rows[0]).getByTestId('deleteWatchButton'));

            const modal = await screen.findByTestId('deleteWatchesConfirmation');
            const confirmButton = within(modal).getByTestId('confirmModalConfirmButton');

            httpRequestsMockHelpers.setDeleteWatchResponse({
              results: {
                successes: [watch1.id],
                errors: [],
              },
            });

            fireEvent.click(confirmButton);

            await waitFor(() => {
              expect(httpSetup.post).toHaveBeenLastCalledWith(
                `${API_BASE_PATH}/watches/delete`,
                expect.anything()
              );
            });
          });
        });
      });
    });
  });
});
