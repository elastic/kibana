/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './helpers/mocks';

import type { EuiSearchBoxProps } from '@elastic/eui/src/components/search_bar/search_box';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';

import { useLoadRepositories, useLoadSnapshots } from '../../public/application/services/http';
import { DEFAULT_SNAPSHOT_LIST_PARAMS } from '../../public/application/lib';
import { SnapshotList } from '../../public/application/sections/home/snapshot_list';

import * as fixtures from '../../test/fixtures';
import { getRandomString } from '@kbn/test-jest-helpers';
import { REPOSITORY_NAME } from './helpers/constant';
import { WithAppDependencies } from './helpers/setup_environment';

/*
 * We are mocking useLoadSnapshots instead of sinon fake server because it's not
 * spying on url parameters used in requests, for example /api/snapshot_restore/snapshots
 * ?sortField=startTimeInMillis&sortDirection=desc&pageIndex=0&pageSize=20
 * &searchField=repository&searchValue=test&searchMatch=must&searchOperator=exact
 * would be shown as url=/api/snapshot_restore/snapshots is sinon server
 */
jest.mock('../../public/application/services/http', () => ({
  useLoadSnapshots: jest.fn(),
  useLoadRepositories: jest.fn(),
  setUiMetricServiceSnapshot: () => {},
  setUiMetricService: () => {},
}));

/*
 * Mocking EuiSearchBar because its onChange is not firing during tests
 */
jest.mock('@elastic/eui/lib/components/search_bar/search_box', () => {
  return {
    EuiSearchBox: (props: EuiSearchBoxProps) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockSearchBox'}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          props.onSearch(event.target.value);
        }}
      />
    ),
  };
});

const renderSnapshotList = (initialEntry: string = '/snapshots') => {
  const SnapshotListWithDeps = WithAppDependencies(SnapshotList);

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route exact path="/snapshots" component={SnapshotListWithDeps} />
        <Route
          exact
          path="/snapshots/:repositoryName*/:snapshotId"
          component={SnapshotListWithDeps}
        />
      </Routes>
    </MemoryRouter>
  );
};

describe('<SnapshotList />', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const snapshot = fixtures.getSnapshot({
      repository: REPOSITORY_NAME,
      snapshot: getRandomString(),
    });
    const snapshots = [snapshot];
    jest.mocked(useLoadSnapshots).mockReturnValue({
      error: null,
      isInitialRequest: false,
      isLoading: false,
      data: {
        snapshots,
        policies: [],
        errors: {},
        total: snapshots.length,
      },
      resendRequest: () => {},
    });
    jest.mocked(useLoadRepositories).mockReturnValue({
      error: null,
      isInitialRequest: false,
      isLoading: false,
      data: {
        repositories: [
          {
            name: REPOSITORY_NAME,
          },
        ],
      },
      resendRequest: () => {},
    });
  });

  describe('search', () => {
    describe('url parameters', () => {
      test('query is updated with repository name from the url', async () => {
        renderSnapshotList('/snapshots?repository=test_repo');
        expect(useLoadSnapshots).lastCalledWith({
          ...DEFAULT_SNAPSHOT_LIST_PARAMS,
          searchField: 'repository',
          searchValue: 'test_repo',
          searchMatch: 'must',
          searchOperator: 'exact',
        });
      });

      test('query is updated with snapshot policy name from the url', async () => {
        renderSnapshotList('/snapshots?policy=test_policy');
        expect(useLoadSnapshots).lastCalledWith({
          ...DEFAULT_SNAPSHOT_LIST_PARAMS,
          searchField: 'policyName',
          searchValue: 'test_policy',
          searchMatch: 'must',
          searchOperator: 'exact',
        });
      });

      test('query is not updated with unknown params from the url', async () => {
        renderSnapshotList('/snapshots?some_param=test_param');
        expect(useLoadSnapshots).lastCalledWith({
          ...DEFAULT_SNAPSHOT_LIST_PARAMS,
        });
      });
    });

    describe('debounce', () => {
      beforeAll(() => {
        jest.useFakeTimers();
      });

      afterAll(() => {
        jest.useRealTimers();
      });

      afterEach(async () => {
        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });
        jest.clearAllTimers();
      });

      test('waits after input to update list params for search', async () => {
        renderSnapshotList();

        fireEvent.change(screen.getByTestId('snapshotListSearch'), {
          target: { value: 'snapshot=test_snapshot' },
        });
        // the last request was without any search params
        expect(useLoadSnapshots).lastCalledWith({
          ...DEFAULT_SNAPSHOT_LIST_PARAMS,
        });
        // advance the timers until after the debounce timeout
        // we use act because the component is updated when the timers advance
        await act(async () => {
          await jest.advanceTimersByTimeAsync(250);
        });

        await waitFor(() => {
          expect(useLoadSnapshots).lastCalledWith({
            ...DEFAULT_SNAPSHOT_LIST_PARAMS,
            searchField: 'snapshot',
            searchValue: 'test_snapshot',
            searchMatch: 'must',
            searchOperator: 'exact',
          });
        });
      });
    });

    describe('query parsing', () => {
      beforeAll(() => {
        jest.useFakeTimers();
      });

      afterAll(() => {
        jest.useRealTimers();
      });

      afterEach(async () => {
        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });
        jest.clearAllTimers();
      });

      const setSearchTextAndFlushDebounce = async (value: string) => {
        fireEvent.change(screen.getByTestId('snapshotListSearch'), { target: { value } });
        await act(async () => {
          await jest.advanceTimersByTimeAsync(250);
        });
      };

      describe('snapshot', () => {
        test('term search is converted to partial snapshot search', async () => {
          renderSnapshotList();
          await setSearchTextAndFlushDebounce('term_snapshot_search');
          await waitFor(() => {
            expect(useLoadSnapshots).lastCalledWith({
              ...DEFAULT_SNAPSHOT_LIST_PARAMS,
              searchField: 'snapshot',
              searchValue: 'term_snapshot_search',
              searchMatch: 'must',
              searchOperator: 'eq',
            });
          });
        });

        test('term search with a date is parsed', async () => {
          renderSnapshotList();
          await setSearchTextAndFlushDebounce('2022.02.10');
          await waitFor(() => {
            expect(useLoadSnapshots).lastCalledWith({
              ...DEFAULT_SNAPSHOT_LIST_PARAMS,
              searchField: 'snapshot',
              searchValue: '2022.02.10',
              searchMatch: 'must',
              searchOperator: 'eq',
            });
          });
        });

        test('excluding term search is converted to partial excluding snapshot search', async () => {
          renderSnapshotList();
          await setSearchTextAndFlushDebounce('-test_snapshot');
          await waitFor(() => {
            expect(useLoadSnapshots).lastCalledWith({
              ...DEFAULT_SNAPSHOT_LIST_PARAMS,
              searchField: 'snapshot',
              searchValue: 'test_snapshot',
              searchMatch: 'must_not',
              searchOperator: 'eq',
            });
          });
        });

        test('partial snapshot search is parsed', async () => {
          renderSnapshotList();
          await setSearchTextAndFlushDebounce('snapshot:test_snapshot');
          await waitFor(() => {
            expect(useLoadSnapshots).lastCalledWith({
              ...DEFAULT_SNAPSHOT_LIST_PARAMS,
              searchField: 'snapshot',
              searchValue: 'test_snapshot',
              searchMatch: 'must',
              searchOperator: 'eq',
            });
          });
        });

        test('excluding partial snapshot search is parsed', async () => {
          renderSnapshotList();
          await setSearchTextAndFlushDebounce('-snapshot:test_snapshot');
          await waitFor(() => {
            expect(useLoadSnapshots).lastCalledWith({
              ...DEFAULT_SNAPSHOT_LIST_PARAMS,
              searchField: 'snapshot',
              searchValue: 'test_snapshot',
              searchMatch: 'must_not',
              searchOperator: 'eq',
            });
          });
        });

        test('exact snapshot search is parsed', async () => {
          renderSnapshotList();
          await setSearchTextAndFlushDebounce('snapshot=test_snapshot');
          await waitFor(() => {
            expect(useLoadSnapshots).lastCalledWith({
              ...DEFAULT_SNAPSHOT_LIST_PARAMS,
              searchField: 'snapshot',
              searchValue: 'test_snapshot',
              searchMatch: 'must',
              searchOperator: 'exact',
            });
          });
        });

        test('excluding exact snapshot search is parsed', async () => {
          renderSnapshotList();
          await setSearchTextAndFlushDebounce('-snapshot=test_snapshot');
          await waitFor(() => {
            expect(useLoadSnapshots).lastCalledWith({
              ...DEFAULT_SNAPSHOT_LIST_PARAMS,
              searchField: 'snapshot',
              searchValue: 'test_snapshot',
              searchMatch: 'must_not',
              searchOperator: 'exact',
            });
          });
        });
      });

      describe('repository', () => {
        test('partial repository search is parsed', async () => {
          renderSnapshotList();
          await setSearchTextAndFlushDebounce('repository:test_repository');
          await waitFor(() => {
            expect(useLoadSnapshots).lastCalledWith({
              ...DEFAULT_SNAPSHOT_LIST_PARAMS,
              searchField: 'repository',
              searchValue: 'test_repository',
              searchMatch: 'must',
              searchOperator: 'eq',
            });
          });
        });

        test('excluding partial repository search is parsed', async () => {
          renderSnapshotList();
          await setSearchTextAndFlushDebounce('-repository:test_repository');
          await waitFor(() => {
            expect(useLoadSnapshots).lastCalledWith({
              ...DEFAULT_SNAPSHOT_LIST_PARAMS,
              searchField: 'repository',
              searchValue: 'test_repository',
              searchMatch: 'must_not',
              searchOperator: 'eq',
            });
          });
        });

        test('exact repository search is parsed', async () => {
          renderSnapshotList();
          await setSearchTextAndFlushDebounce('repository=test_repository');
          await waitFor(() => {
            expect(useLoadSnapshots).lastCalledWith({
              ...DEFAULT_SNAPSHOT_LIST_PARAMS,
              searchField: 'repository',
              searchValue: 'test_repository',
              searchMatch: 'must',
              searchOperator: 'exact',
            });
          });
        });

        test('excluding exact repository search is parsed', async () => {
          renderSnapshotList();
          await setSearchTextAndFlushDebounce('-repository=test_repository');
          await waitFor(() => {
            expect(useLoadSnapshots).lastCalledWith({
              ...DEFAULT_SNAPSHOT_LIST_PARAMS,
              searchField: 'repository',
              searchValue: 'test_repository',
              searchMatch: 'must_not',
              searchOperator: 'exact',
            });
          });
        });
      });

      describe('policy', () => {
        test('partial policy search is parsed', async () => {
          renderSnapshotList();
          await setSearchTextAndFlushDebounce('policyName:test_policy');
          await waitFor(() => {
            expect(useLoadSnapshots).lastCalledWith({
              ...DEFAULT_SNAPSHOT_LIST_PARAMS,
              searchField: 'policyName',
              searchValue: 'test_policy',
              searchMatch: 'must',
              searchOperator: 'eq',
            });
          });
        });

        test('excluding partial policy search is parsed', async () => {
          renderSnapshotList();
          await setSearchTextAndFlushDebounce('-policyName:test_policy');
          await waitFor(() => {
            expect(useLoadSnapshots).lastCalledWith({
              ...DEFAULT_SNAPSHOT_LIST_PARAMS,
              searchField: 'policyName',
              searchValue: 'test_policy',
              searchMatch: 'must_not',
              searchOperator: 'eq',
            });
          });
        });

        test('exact policy search is parsed', async () => {
          renderSnapshotList();
          await setSearchTextAndFlushDebounce('policyName=test_policy');
          await waitFor(() => {
            expect(useLoadSnapshots).lastCalledWith({
              ...DEFAULT_SNAPSHOT_LIST_PARAMS,
              searchField: 'policyName',
              searchValue: 'test_policy',
              searchMatch: 'must',
              searchOperator: 'exact',
            });
          });
        });

        test('excluding exact policy search is parsed', async () => {
          renderSnapshotList();
          await setSearchTextAndFlushDebounce('-policyName=test_policy');
          await waitFor(() => {
            expect(useLoadSnapshots).lastCalledWith({
              ...DEFAULT_SNAPSHOT_LIST_PARAMS,
              searchField: 'policyName',
              searchValue: 'test_policy',
              searchMatch: 'must_not',
              searchOperator: 'exact',
            });
          });
        });
      });

      describe('state', () => {
        test('partial state search is parsed', async () => {
          renderSnapshotList();
          await setSearchTextAndFlushDebounce('state:SUCCESS');
          await waitFor(() => {
            expect(useLoadSnapshots).lastCalledWith({
              ...DEFAULT_SNAPSHOT_LIST_PARAMS,
              searchField: 'state',
              searchValue: 'SUCCESS',
              searchMatch: 'must',
              searchOperator: 'eq',
            });
          });
        });

        test('excluding partial state search is parsed', async () => {
          renderSnapshotList();
          await setSearchTextAndFlushDebounce('-state:FAILED');
          await waitFor(() => {
            expect(useLoadSnapshots).lastCalledWith({
              ...DEFAULT_SNAPSHOT_LIST_PARAMS,
              searchField: 'state',
              searchValue: 'FAILED',
              searchMatch: 'must_not',
              searchOperator: 'eq',
            });
          });
        });

        test('exact state search is parsed', async () => {
          renderSnapshotList();
          await setSearchTextAndFlushDebounce('state=IN_PROGRESS');
          await waitFor(() => {
            expect(useLoadSnapshots).lastCalledWith({
              ...DEFAULT_SNAPSHOT_LIST_PARAMS,
              searchField: 'state',
              searchValue: 'IN_PROGRESS',
              searchMatch: 'must',
              searchOperator: 'exact',
            });
          });
        });

        test('excluding exact state search is parsed', async () => {
          renderSnapshotList();
          await setSearchTextAndFlushDebounce('-state=PARTIAL');
          await waitFor(() => {
            expect(useLoadSnapshots).lastCalledWith({
              ...DEFAULT_SNAPSHOT_LIST_PARAMS,
              searchField: 'state',
              searchValue: 'PARTIAL',
              searchMatch: 'must_not',
              searchOperator: 'exact',
            });
          });
        });
      });
    });

    describe('error handling', () => {
      test(`doesn't allow more than 1 terms in the query`, async () => {
        renderSnapshotList();
        fireEvent.change(screen.getByTestId('snapshotListSearch'), {
          target: { value: 'term1 term2' },
        });
        expect(useLoadSnapshots).lastCalledWith({
          ...DEFAULT_SNAPSHOT_LIST_PARAMS,
        });
        expect(screen.getByTestId('snapshotListSearchError')).toBeInTheDocument();
        expect(screen.getByTestId('snapshotListSearchError')).toHaveTextContent(
          'Invalid search: You can only use one clause in the search bar'
        );
      });

      test(`doesn't allow more than 1 clauses in the query`, async () => {
        renderSnapshotList();
        fireEvent.change(screen.getByTestId('snapshotListSearch'), {
          target: { value: 'snapshot=test_snapshot policyName:test_policy' },
        });
        expect(useLoadSnapshots).lastCalledWith({
          ...DEFAULT_SNAPSHOT_LIST_PARAMS,
        });
        expect(screen.getByTestId('snapshotListSearchError')).toBeInTheDocument();
        expect(screen.getByTestId('snapshotListSearchError')).toHaveTextContent(
          'Invalid search: You can only use one clause in the search bar'
        );
      });

      test(`doesn't allow unknown properties in the query`, async () => {
        renderSnapshotList();
        fireEvent.change(screen.getByTestId('snapshotListSearch'), {
          target: { value: 'unknown_field=test' },
        });
        expect(useLoadSnapshots).lastCalledWith({
          ...DEFAULT_SNAPSHOT_LIST_PARAMS,
        });
        expect(screen.getByTestId('snapshotListSearchError')).toBeInTheDocument();
        expect(screen.getByTestId('snapshotListSearchError')).toHaveTextContent(
          'Invalid search: Unknown field `unknown_field`'
        );
      });
    });
  });

  describe('last successful managed snapshot protection', () => {
    const managedRepository = 'managed_repo';

    beforeEach(() => {
      jest.mocked(useLoadRepositories).mockReturnValue({
        error: null,
        isInitialRequest: false,
        isLoading: false,
        data: {
          repositories: [
            {
              name: managedRepository,
            },
            {
              name: 'regular_repo',
            },
          ],
        },
        resendRequest: () => {},
      });
    });

    test('renders snapshots with isLastSuccessfulSnapshot flag correctly', async () => {
      const snapshots = [
        fixtures.getSnapshot({
          repository: managedRepository,
          snapshot: 'snapshot1',
          state: 'SUCCESS',
          managedRepository,
          isLastSuccessfulSnapshot: false,
        }),
        fixtures.getSnapshot({
          repository: managedRepository,
          snapshot: 'snapshot2',
          state: 'SUCCESS',
          managedRepository,
          isLastSuccessfulSnapshot: true, // This should be non-selectable
        }),
      ];

      jest.mocked(useLoadSnapshots).mockReturnValue({
        error: null,
        isInitialRequest: false,
        isLoading: false,
        data: {
          snapshots,
          policies: [],
          errors: {},
          total: snapshots.length,
        },
        resendRequest: () => {},
      });

      renderSnapshotList();

      await screen.findByTestId('snapshotTable');

      // Snapshot that is the last successful snapshot in a managed repository should have delete disabled.
      const row = screen.getByText('snapshot2').closest('tr');
      if (!row) throw new Error('Expected snapshot row to exist for snapshot2');
      const deleteButton = within(row).getByTestId('srsnapshotListDeleteActionButton');
      expect(deleteButton).toBeDisabled();
    });

    test('renders snapshots from non-managed repositories correctly', async () => {
      const snapshots = [
        fixtures.getSnapshot({
          repository: 'regular_repo',
          snapshot: 'snapshot1',
          state: 'SUCCESS',
          managedRepository,
          isLastSuccessfulSnapshot: false,
        }),
      ];

      jest.mocked(useLoadSnapshots).mockReturnValue({
        error: null,
        isInitialRequest: false,
        isLoading: false,
        data: {
          snapshots,
          policies: [],
          errors: {},
          total: snapshots.length,
        },
        resendRequest: () => {},
      });

      renderSnapshotList();

      await screen.findByTestId('snapshotTable');

      const row = screen.getByText('snapshot1').closest('tr');
      if (!row) throw new Error('Expected snapshot row to exist for snapshot1');
      const deleteButton = within(row).getByTestId('srsnapshotListDeleteActionButton');
      expect(deleteButton).not.toBeDisabled();
    });

    test('renders snapshots when there is no managed repository', async () => {
      const snapshots = [
        fixtures.getSnapshot({
          repository: 'regular_repo',
          snapshot: 'snapshot1',
          state: 'SUCCESS',
          managedRepository: undefined,
          isLastSuccessfulSnapshot: false,
        }),
      ];

      jest.mocked(useLoadSnapshots).mockReturnValue({
        error: null,
        isInitialRequest: false,
        isLoading: false,
        data: {
          snapshots,
          policies: [],
          errors: {},
          total: snapshots.length,
        },
        resendRequest: () => {},
      });

      renderSnapshotList();

      await screen.findByTestId('snapshotTable');

      const row = screen.getByText('snapshot1').closest('tr');
      if (!row) throw new Error('Expected snapshot row to exist for snapshot1');
      const deleteButton = within(row).getByTestId('srsnapshotListDeleteActionButton');
      expect(deleteButton).not.toBeDisabled();
    });
  });
});
