/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import type { EuiSearchBoxProps } from '@elastic/eui/src/components/search_bar/search_box';

import { useLoadRepositories, useLoadSnapshots } from '../../public/application/services/http';
import { DEFAULT_SNAPSHOT_LIST_PARAMS } from '../../public/application/lib';

import * as fixtures from '../../test/fixtures';
import type { SnapshotListTestBed } from './helpers/snapshot_list.helpers';
import { REPOSITORY_NAME } from './helpers/constant';
import { pageHelpers, getRandomString } from './helpers';

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

const { setup } = pageHelpers.snapshotList;

describe('<SnapshotList />', () => {
  let testBed: SnapshotListTestBed;
  let setSearchText: SnapshotListTestBed['actions']['setSearchText'];
  let searchErrorExists: SnapshotListTestBed['actions']['searchErrorExists'];
  let getSearchErrorText: SnapshotListTestBed['actions']['getSearchErrorText'];

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
    const snapshot = fixtures.getSnapshot({
      repository: REPOSITORY_NAME,
      snapshot: getRandomString(),
    });
    const snapshots = [snapshot];
    (useLoadSnapshots as jest.Mock).mockReturnValue({
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
    (useLoadRepositories as jest.Mock).mockReturnValue({
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
    });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    testBed = await setup();
    ({
      actions: { setSearchText, searchErrorExists, getSearchErrorText },
    } = testBed);
  });

  describe('search', () => {
    describe('url parameters', () => {
      test('query is updated with repository name from the url', async () => {
        testBed = await setup('?repository=test_repo');
        expect(useLoadSnapshots).lastCalledWith({
          ...DEFAULT_SNAPSHOT_LIST_PARAMS,
          searchField: 'repository',
          searchValue: 'test_repo',
          searchMatch: 'must',
          searchOperator: 'exact',
        });
      });

      test('query is updated with snapshot policy name from the url', async () => {
        testBed = await setup('?policy=test_policy');
        expect(useLoadSnapshots).lastCalledWith({
          ...DEFAULT_SNAPSHOT_LIST_PARAMS,
          searchField: 'policyName',
          searchValue: 'test_policy',
          searchMatch: 'must',
          searchOperator: 'exact',
        });
      });

      test('query is not updated with unknown params from the url', async () => {
        testBed = await setup('?some_param=test_param');
        expect(useLoadSnapshots).lastCalledWith({
          ...DEFAULT_SNAPSHOT_LIST_PARAMS,
        });
      });
    });

    describe('debounce', () => {
      test('waits after input to update list params for search', async () => {
        const ADVANCE_TIME = false;
        await setSearchText('snapshot=test_snapshot', ADVANCE_TIME);
        // the last request was without any search params
        expect(useLoadSnapshots).lastCalledWith({
          ...DEFAULT_SNAPSHOT_LIST_PARAMS,
        });
        // advance the timers until after the debounce timeout
        // we use act because the component is updated when the timers advance
        act(() => {
          jest.advanceTimersByTime(500);
        });
        expect(useLoadSnapshots).lastCalledWith({
          ...DEFAULT_SNAPSHOT_LIST_PARAMS,
          searchField: 'snapshot',
          searchValue: 'test_snapshot',
          searchMatch: 'must',
          searchOperator: 'exact',
        });
      });
    });

    describe('query parsing', () => {
      describe('snapshot', () => {
        test('term search is converted to partial snapshot search', async () => {
          await setSearchText('term_snapshot_search');
          expect(useLoadSnapshots).lastCalledWith({
            ...DEFAULT_SNAPSHOT_LIST_PARAMS,
            searchField: 'snapshot',
            searchValue: 'term_snapshot_search',
            searchMatch: 'must',
            searchOperator: 'eq',
          });
        });

        test('term search with a date is parsed', async () => {
          await setSearchText('2022.02.10');
          expect(useLoadSnapshots).lastCalledWith({
            ...DEFAULT_SNAPSHOT_LIST_PARAMS,
            searchField: 'snapshot',
            searchValue: '2022.02.10',
            searchMatch: 'must',
            searchOperator: 'eq',
          });
        });

        test('excluding term search is converted to partial excluding snapshot search', async () => {
          await setSearchText('-test_snapshot');
          expect(useLoadSnapshots).lastCalledWith({
            ...DEFAULT_SNAPSHOT_LIST_PARAMS,
            searchField: 'snapshot',
            searchValue: 'test_snapshot',
            searchMatch: 'must_not',
            searchOperator: 'eq',
          });
        });

        test('partial snapshot search is parsed', async () => {
          await setSearchText('snapshot:test_snapshot');
          expect(useLoadSnapshots).lastCalledWith({
            ...DEFAULT_SNAPSHOT_LIST_PARAMS,
            searchField: 'snapshot',
            searchValue: 'test_snapshot',
            searchMatch: 'must',
            searchOperator: 'eq',
          });
        });

        test('excluding partial snapshot search is parsed', async () => {
          await setSearchText('-snapshot:test_snapshot');
          expect(useLoadSnapshots).lastCalledWith({
            ...DEFAULT_SNAPSHOT_LIST_PARAMS,
            searchField: 'snapshot',
            searchValue: 'test_snapshot',
            searchMatch: 'must_not',
            searchOperator: 'eq',
          });
        });

        test('exact snapshot search is parsed', async () => {
          await setSearchText('snapshot=test_snapshot');
          expect(useLoadSnapshots).lastCalledWith({
            ...DEFAULT_SNAPSHOT_LIST_PARAMS,
            searchField: 'snapshot',
            searchValue: 'test_snapshot',
            searchMatch: 'must',
            searchOperator: 'exact',
          });
        });

        test('excluding exact snapshot search is parsed', async () => {
          await setSearchText('-snapshot=test_snapshot');
          expect(useLoadSnapshots).lastCalledWith({
            ...DEFAULT_SNAPSHOT_LIST_PARAMS,
            searchField: 'snapshot',
            searchValue: 'test_snapshot',
            searchMatch: 'must_not',
            searchOperator: 'exact',
          });
        });
      });

      describe('repository', () => {
        test('partial repository search is parsed', async () => {
          await setSearchText('repository:test_repository');
          expect(useLoadSnapshots).lastCalledWith({
            ...DEFAULT_SNAPSHOT_LIST_PARAMS,
            searchField: 'repository',
            searchValue: 'test_repository',
            searchMatch: 'must',
            searchOperator: 'eq',
          });
        });

        test('excluding partial repository search is parsed', async () => {
          await setSearchText('-repository:test_repository');
          expect(useLoadSnapshots).lastCalledWith({
            ...DEFAULT_SNAPSHOT_LIST_PARAMS,
            searchField: 'repository',
            searchValue: 'test_repository',
            searchMatch: 'must_not',
            searchOperator: 'eq',
          });
        });

        test('exact repository search is parsed', async () => {
          await setSearchText('repository=test_repository');
          expect(useLoadSnapshots).lastCalledWith({
            ...DEFAULT_SNAPSHOT_LIST_PARAMS,
            searchField: 'repository',
            searchValue: 'test_repository',
            searchMatch: 'must',
            searchOperator: 'exact',
          });
        });

        test('excluding exact repository search is parsed', async () => {
          await setSearchText('-repository=test_repository');
          expect(useLoadSnapshots).lastCalledWith({
            ...DEFAULT_SNAPSHOT_LIST_PARAMS,
            searchField: 'repository',
            searchValue: 'test_repository',
            searchMatch: 'must_not',
            searchOperator: 'exact',
          });
        });
      });

      describe('policy', () => {
        test('partial policy search is parsed', async () => {
          await setSearchText('policyName:test_policy');
          expect(useLoadSnapshots).lastCalledWith({
            ...DEFAULT_SNAPSHOT_LIST_PARAMS,
            searchField: 'policyName',
            searchValue: 'test_policy',
            searchMatch: 'must',
            searchOperator: 'eq',
          });
        });

        test('excluding partial policy search is parsed', async () => {
          await setSearchText('-policyName:test_policy');
          expect(useLoadSnapshots).lastCalledWith({
            ...DEFAULT_SNAPSHOT_LIST_PARAMS,
            searchField: 'policyName',
            searchValue: 'test_policy',
            searchMatch: 'must_not',
            searchOperator: 'eq',
          });
        });

        test('exact policy search is parsed', async () => {
          await setSearchText('policyName=test_policy');
          expect(useLoadSnapshots).lastCalledWith({
            ...DEFAULT_SNAPSHOT_LIST_PARAMS,
            searchField: 'policyName',
            searchValue: 'test_policy',
            searchMatch: 'must',
            searchOperator: 'exact',
          });
        });

        test('excluding exact policy search is parsed', async () => {
          await setSearchText('-policyName=test_policy');
          expect(useLoadSnapshots).lastCalledWith({
            ...DEFAULT_SNAPSHOT_LIST_PARAMS,
            searchField: 'policyName',
            searchValue: 'test_policy',
            searchMatch: 'must_not',
            searchOperator: 'exact',
          });
        });
      });

      describe('state', () => {
        test('partial state search is parsed', async () => {
          await setSearchText('state:SUCCESS');
          expect(useLoadSnapshots).lastCalledWith({
            ...DEFAULT_SNAPSHOT_LIST_PARAMS,
            searchField: 'state',
            searchValue: 'SUCCESS',
            searchMatch: 'must',
            searchOperator: 'eq',
          });
        });

        test('excluding partial state search is parsed', async () => {
          await setSearchText('-state:FAILED');
          expect(useLoadSnapshots).lastCalledWith({
            ...DEFAULT_SNAPSHOT_LIST_PARAMS,
            searchField: 'state',
            searchValue: 'FAILED',
            searchMatch: 'must_not',
            searchOperator: 'eq',
          });
        });

        test('exact state search is parsed', async () => {
          await setSearchText('state=IN_PROGRESS');
          expect(useLoadSnapshots).lastCalledWith({
            ...DEFAULT_SNAPSHOT_LIST_PARAMS,
            searchField: 'state',
            searchValue: 'IN_PROGRESS',
            searchMatch: 'must',
            searchOperator: 'exact',
          });
        });

        test('excluding exact state search is parsed', async () => {
          await setSearchText('-state=PARTIAL');
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

    describe('error handling', () => {
      test(`doesn't allow more than 1 terms in the query`, async () => {
        await setSearchText('term1 term2');
        expect(useLoadSnapshots).lastCalledWith({
          ...DEFAULT_SNAPSHOT_LIST_PARAMS,
        });
        expect(searchErrorExists()).toBeTruthy();
        expect(getSearchErrorText()).toEqual(
          'Invalid search: You can only use one clause in the search bar'
        );
      });

      test(`doesn't allow more than 1 clauses in the query`, async () => {
        await setSearchText('snapshot=test_snapshot policyName:test_policy');
        expect(useLoadSnapshots).lastCalledWith({
          ...DEFAULT_SNAPSHOT_LIST_PARAMS,
        });
        expect(searchErrorExists()).toBeTruthy();
        expect(getSearchErrorText()).toEqual(
          'Invalid search: You can only use one clause in the search bar'
        );
      });

      test(`doesn't allow unknown properties in the query`, async () => {
        await setSearchText('unknown_field=test');
        expect(useLoadSnapshots).lastCalledWith({
          ...DEFAULT_SNAPSHOT_LIST_PARAMS,
        });
        expect(searchErrorExists()).toBeTruthy();
        expect(getSearchErrorText()).toEqual('Invalid search: Unknown field `unknown_field`');
      });
    });
  });

  describe('last successful managed snapshot protection', () => {
    const managedRepository = 'managed_repo';

    beforeEach(() => {
      (useLoadRepositories as jest.Mock).mockReturnValue({
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

      (useLoadSnapshots as jest.Mock).mockReturnValue({
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

      testBed = await setup();
      const { component } = testBed;

      // Component should render successfully with the snapshots
      expect(component.find('EuiBasicTable').exists()).toBe(true);

      // Both snapshots should be visible in the table
      const table = component.find('EuiBasicTable');
      expect(table.prop('items')).toEqual(snapshots);
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

      (useLoadSnapshots as jest.Mock).mockReturnValue({
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

      testBed = await setup();
      const { component } = testBed;

      // Component should render successfully
      expect(component.find('EuiBasicTable').exists()).toBe(true);

      // Snapshot should be visible in the table
      const table = component.find('EuiBasicTable');
      expect(table.prop('items')).toEqual(snapshots);
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

      (useLoadSnapshots as jest.Mock).mockReturnValue({
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

      testBed = await setup();
      const { component } = testBed;

      // Component should render successfully
      expect(component.find('EuiBasicTable').exists()).toBe(true);

      // All snapshots should be visible
      const table = component.find('EuiBasicTable');
      expect(table.prop('items')).toEqual(snapshots);
    });
  });
});
