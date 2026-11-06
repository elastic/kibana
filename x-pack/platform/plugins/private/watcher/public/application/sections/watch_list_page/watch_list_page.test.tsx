/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@kbn/code-editor-mock/jest_helper';
import type { LocationDescriptorObject } from 'history';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { notificationServiceMock, scopedHistoryMock } from '@kbn/core/public/mocks';

import { getWatch } from '../../../../__fixtures__';
import { Watch } from '../../models/watch';
import { deleteWatches, useLoadWatches } from '../../lib/api';
import { WatchListPage } from './watch_list_page';

jest.mock('../../lib/api', () => ({
  ...jest.requireActual('../../lib/api'),
  useLoadWatches: jest.fn(),
  deleteWatches: jest.fn(),
}));

jest.mock('../../lib/navigation', () => ({
  ...jest.requireActual('../../lib/navigation'),
  goToCreateThresholdAlert: jest.fn(),
  goToCreateAdvancedWatch: jest.fn(),
}));

const mockUseAppContext = jest.fn();
jest.mock('../../app_context', () => ({
  ...jest.requireActual('../../app_context'),
  useAppContext: () => mockUseAppContext(),
}));

const useLoadWatchesMock = jest.mocked(useLoadWatches);
const deleteWatchesMock = jest.mocked(deleteWatches);

const toWatchModels = (watches: Array<ReturnType<typeof getWatch>>) =>
  watches.map((watch) => Watch.fromUpstreamJson({ ...watch }));

type LoadWatchesResponse = ReturnType<typeof useLoadWatches>;

const setLoadWatchesResponse = ({
  data,
  isLoading = false,
  error = null,
}: Partial<Pick<LoadWatchesResponse, 'data' | 'isLoading' | 'error'>>) => {
  useLoadWatchesMock.mockReturnValue({
    isInitialRequest: false,
    isLoading,
    error,
    data,
    resendRequest: jest.fn(),
  });
};

const createAppContextValue = () => {
  const history = scopedHistoryMock.create();
  history.createHref.mockImplementation(
    (location: LocationDescriptorObject) =>
      `${location.pathname}${location.search ? '?' + location.search : ''}`
  );

  return {
    setBreadcrumbs: jest.fn(),
    history,
    toasts: notificationServiceMock.createSetupContract().toasts,
    links: { watcherGettingStartedUrl: 'https://example.invalid/watcher' },
  };
};

const watchListPage = (
  <I18nProvider>
    <MockAppHeaderProvider>
      <WatchListPage />
    </MockAppHeaderProvider>
  </I18nProvider>
);

const renderWatchListPage = async () => {
  const { rerender } = render(watchListPage);
  await act(async () => {});
  return { rerender: () => rerender(watchListPage) };
};

const getSearchInput = () => {
  const container = screen.getByTestId('watchesTableContainer');
  return within(container).getByRole('searchbox');
};

const search = (value: string) => {
  const searchInput = getSearchInput();
  fireEvent.change(searchInput, { target: { value } });
  fireEvent.keyUp(searchInput, { key: 'Enter', keyCode: 13, which: 13 });
};

const watch1 = getWatch({ name: 'watchA-name', id: 'a-id', type: 'threshold' });
const watch2 = getWatch({ name: 'watchB-name', id: 'b-id', type: 'json' });
const watch3 = getWatch({
  name: 'watchC-name',
  id: 'c-id',
  type: 'monitoring',
  isSystemWatch: true,
});
const watches = [watch1, watch2, watch3];

describe('<WatchListPage />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppContext.mockReturnValue(createAppContextValue());
  });

  describe('WHEN the watches are still loading', () => {
    it('SHOULD show the loading message', async () => {
      setLoadWatchesResponse({ isLoading: true });

      await renderWatchListPage();

      expect(screen.getByTestId('sectionLoading')).toHaveTextContent('Loading watches…');
    });
  });

  describe('WHEN there are no watches', () => {
    beforeEach(async () => {
      setLoadWatchesResponse({ data: [] });
      await renderWatchListPage();
    });

    it('SHOULD display an empty prompt with a button to create a watch', () => {
      expect(screen.getByTestId('emptyPrompt')).toBeInTheDocument();
      expect(screen.getByTestId('createWatchButton')).toBeInTheDocument();
    });
  });

  describe('WHEN there are watches', () => {
    let rerenderWatchListPage: () => void;

    beforeEach(async () => {
      setLoadWatchesResponse({ data: toWatchModels(watches) });
      ({ rerender: rerenderWatchListPage } = await renderWatchListPage());
    });

    it('SHOULD show an error callout if the search is invalid', async () => {
      search('or');

      expect(await screen.findByTestId('watcherListSearchError')).toBeInTheDocument();
    });

    it('SHOULD retain the search query when the watches are refreshed', async () => {
      search(watch1.name);

      await waitFor(() => {
        expect(screen.getAllByTestId('row')).toHaveLength(1);
      });
      expect(screen.getByTestId(`watchIdColumn-${watch1.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`watchNameColumn-${watch1.id}`)).toHaveTextContent(watch1.name);

      setLoadWatchesResponse({ data: toWatchModels(watches) });
      rerenderWatchListPage();

      await waitFor(() => {
        expect(screen.getAllByTestId('row')).toHaveLength(1);
      });
      expect(screen.getByTestId(`watchIdColumn-${watch1.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`watchNameColumn-${watch1.id}`)).toHaveTextContent(watch1.name);
    });

    it('SHOULD set the correct app title', () => {
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Watcher');
    });

    it('SHOULD have a link to the documentation', async () => {
      await openAppMenuOverflow();

      expect(
        await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)
      ).toBeInTheDocument();
    });

    it('SHOULD list the watches in the table', () => {
      const rows = screen.getAllByTestId('row');
      expect(rows).toHaveLength(3);

      rows.forEach((rowEl, index) => {
        const watch = watches[index];
        expect(within(rowEl).getByTestId(`watchIdColumn-${watch.id}`)).toBeInTheDocument();
        expect(within(rowEl).getByTestId(`watchNameColumn-${watch.id}`)).toHaveTextContent(
          watch.name
        );
      });
    });

    it('SHOULD have a button to create a watch', () => {
      expect(screen.getByTestId('createWatchButton')).toBeInTheDocument();
    });

    it('SHOULD have a link to view the watch details', () => {
      expect(screen.getByTestId(`watchIdColumn-${watch1.id}`)).toHaveAttribute(
        'href',
        `/watches/watch/${watch1.id}/status`
      );
    });

    it('SHOULD have action buttons on each row to edit and delete a watch', () => {
      const [firstRow] = screen.getAllByTestId('row');

      expect(within(firstRow).getByTestId('editWatchButton')).toBeInTheDocument();
      expect(within(firstRow).getByTestId('deleteWatchButton')).toBeInTheDocument();
    });

    describe('AND a watch is a system watch', () => {
      it('SHOULD disable the edit and delete actions', () => {
        const systemRow = screen.getAllByTestId('row')[2];

        expect(within(systemRow).getByTestId('editWatchButton')).toBeDisabled();
        expect(within(systemRow).getByTestId('deleteWatchButton')).toBeDisabled();
      });
    });

    describe('AND the delete watch button is clicked', () => {
      it('SHOULD show a confirmation modal', async () => {
        const [firstRow] = screen.getAllByTestId('row');
        fireEvent.click(within(firstRow).getByTestId('deleteWatchButton'));

        const modal = await screen.findByTestId('deleteWatchesConfirmation');
        expect(modal).toHaveTextContent('Delete watch');
      });

      it('SHOULD delete the watch and remove it from the table when confirming', async () => {
        deleteWatchesMock.mockResolvedValue({ successes: [watch1.id], errors: [] });

        const [firstRow] = screen.getAllByTestId('row');
        fireEvent.click(within(firstRow).getByTestId('deleteWatchButton'));

        const modal = await screen.findByTestId('deleteWatchesConfirmation');
        fireEvent.click(within(modal).getByTestId('confirmModalConfirmButton'));

        await waitFor(() => {
          expect(deleteWatchesMock).toHaveBeenCalledWith([watch1.id]);
        });
        await waitFor(() => {
          expect(screen.queryByTestId(`watchIdColumn-${watch1.id}`)).not.toBeInTheDocument();
        });
      });
    });
  });
});
