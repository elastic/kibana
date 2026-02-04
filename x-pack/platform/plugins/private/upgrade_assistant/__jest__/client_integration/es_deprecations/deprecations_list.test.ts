/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { API_BASE_PATH } from '../../../common/constants';
import type {
  ESUpgradeStatus,
  EnrichedDeprecationInfo,
  MlAction,
  ReindexAction,
  UnfreezeAction,
} from '../../../common/types';
import { DataStreamMigrationStatus } from '../../../common/types';
import { ReindexStep } from '@kbn/reindex-service-plugin/common';
import { ReindexStatus } from '@kbn/upgrade-assistant-pkg-common';
import { REINDEX_SERVICE_BASE_PATH } from '@kbn/reindex-service-plugin/server';
import { setupEnvironment } from '../helpers/setup_environment';
import { setupElasticsearchPage } from './es_deprecations.helpers';
import {
  esDeprecationsMockResponse,
  MOCK_SNAPSHOT_ID,
  MOCK_JOB_ID,
  createEsDeprecationsMockResponse,
  MOCK_DS_DEPRECATION,
  MOCK_DS_DEPRECATION_REINDEX,
  MOCK_DS_DEPRECATION_READ_ONLY,
} from './mocked_responses';

// Failing: See https://github.com/elastic/kibana/issues/248433
describe.skip('ES deprecations table', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  const waitForResolutionCellsToSettle = async () => {
    if (screen.queryAllByTestId('deprecationTableRow').length === 0) {
      return;
    }

    // Wait on a visible UI boundary that indicates mount-time status providers have settled.
    // (Avoids act warnings without introducing fake timers.)
    await waitFor(() => {
      expect(screen.queryAllByText('Loading status…')).toHaveLength(0);
    });

    await waitFor(() => {
      const indexResolutionCells = screen.queryAllByTestId('reindexTableCell-correctiveAction');
      const dataStreamResolutionCells = screen.queryAllByTestId(
        'dataStreamReindexTableCell-correctiveAction'
      );

      for (const cell of [...indexResolutionCells, ...dataStreamResolutionCells]) {
        expect(cell).not.toHaveTextContent('Loading status…');
      }
    });
  };

  const setupPage = async () => {
    await setupElasticsearchPage(httpSetup);
    // Avoid act() warnings from async status-fetch effects by waiting for the resolution cells
    // to exit their "Loading status…" placeholder state.
    await waitForResolutionCellsToSettle();
  };

  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;

    httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esDeprecationsMockResponse);
    httpRequestsMockHelpers.setUpgradeMlSnapshotStatusResponse({
      nodeId: 'my_node',
      snapshotId: MOCK_SNAPSHOT_ID,
      jobId: MOCK_JOB_ID,
      status: 'idle',
    });
    httpRequestsMockHelpers.setReindexStatusResponse('reindex_index', {
      reindexOp: null,
      warnings: [],
      hasRequiredPrivileges: true,
      meta: {
        indexName: 'foo',
        reindexName: 'reindexed-foo',
        aliases: [],
      },
    });
    httpRequestsMockHelpers.setLoadRemoteClustersResponse([]);
  });

  afterEach(async () => {
    await waitForResolutionCellsToSettle();
  });

  it('renders deprecations', async () => {
    await setupPage();

    // Verify container exists
    expect(screen.getByTestId('esDeprecationsContent')).toBeInTheDocument();

    // Verify all deprecations appear in the table
    expect(screen.getAllByTestId('deprecationTableRow')).toHaveLength(
      esDeprecationsMockResponse.migrationsDeprecations.length
    );
  });

  it('refreshes deprecation data', async () => {
    await setupPage();
    fireEvent.click(screen.getByTestId('refreshButton'));

    const mlDeprecation = esDeprecationsMockResponse.migrationsDeprecations[0];
    const reindexDeprecation = esDeprecationsMockResponse.migrationsDeprecations[3];

    // Since upgradeStatusMockResponse includes ML and reindex actions (which require fetching status), there will be 4 requests made
    await waitFor(() => {
      expect(httpSetup.get).toHaveBeenCalledWith(
        `${API_BASE_PATH}/es_deprecations`,
        expect.anything()
      );
      expect(httpSetup.get).toHaveBeenCalledWith(
        `${API_BASE_PATH}/ml_snapshots/${(mlDeprecation.correctiveAction as MlAction).jobId}/${
          (mlDeprecation.correctiveAction as MlAction).snapshotId
        }`,
        expect.anything()
      );
      expect(httpSetup.get).toHaveBeenCalledWith(
        `${REINDEX_SERVICE_BASE_PATH}/${reindexDeprecation.index}`,
        expect.anything()
      );
      expect(httpSetup.get).toHaveBeenCalledWith(
        `${API_BASE_PATH}/ml_upgrade_mode`,
        expect.anything()
      );
    });
  });

  it('shows critical and warning deprecations count', async () => {
    await setupPage();

    const criticalDeprecations = esDeprecationsMockResponse.migrationsDeprecations.filter(
      (deprecation) => deprecation.level === 'critical'
    );
    const warningDeprecations = esDeprecationsMockResponse.migrationsDeprecations.filter(
      (deprecation) => deprecation.level !== 'critical'
    );

    expect(screen.getByTestId('criticalDeprecationsCount')).toHaveTextContent(
      String(criticalDeprecations.length)
    );
    expect(screen.getByTestId('warningDeprecationsCount')).toHaveTextContent(
      String(warningDeprecations.length)
    );
  });

  describe('remote clusters callout', () => {
    beforeEach(() => {
      httpRequestsMockHelpers.setLoadRemoteClustersResponse(['test_remote_cluster']);
    });

    it('shows a warning message if a user has remote clusters configured', async () => {
      await setupPage();
      // Verify warning exists
      expect(screen.getByTestId('remoteClustersWarningCallout')).toBeInTheDocument();
    });
  });

  describe('search bar', () => {
    let user: ReturnType<typeof userEvent.setup>;

    beforeEach(() => {
      user = userEvent.setup();
    });

    const clickFilterByIndex = async (index: number) => {
      const searchBar = screen.getByTestId('searchBarContainer');
      const filterButtons = searchBar.querySelectorAll('button.euiFilterButton');

      expect(filterButtons[index]).toBeDefined();
      await user.click(filterButtons[index] as HTMLButtonElement);
    };

    const clickFilterByTitle = async (title: string) => {
      const filterButton = await waitFor(() => {
        const el: HTMLButtonElement | null = document.body.querySelector(
          `.euiSelectableListItem[title="${title}"]`
        );
        expect(el).not.toBeNull();
        return el!;
      });

      await user.click(filterButton);
    };

    const setSearchInputValue = async (searchValue: string) => {
      const input = within(screen.getByTestId('searchBarContainer')).getByRole('searchbox');
      fireEvent.change(input, { target: { value: searchValue } });
      fireEvent.keyUp(input, { target: { value: searchValue } });
    };

    it('filters results by status', async () => {
      await setupPage();

      await clickFilterByIndex(0); // status filter is first
      await clickFilterByTitle('Critical');

      const criticalDeprecations = esDeprecationsMockResponse.migrationsDeprecations.filter(
        (deprecation) => deprecation.level === 'critical'
      );

      await waitFor(() =>
        expect(screen.getAllByTestId('deprecationTableRow')).toHaveLength(
          criticalDeprecations.length
        )
      );

      await clickFilterByIndex(0);
      await clickFilterByTitle('Critical'); // Reset filter

      await waitFor(() =>
        expect(screen.getAllByTestId('deprecationTableRow')).toHaveLength(
          esDeprecationsMockResponse.migrationsDeprecations.length
        )
      );
    });

    it('filters results by type', async () => {
      await setupPage();

      await clickFilterByIndex(1); // type filter is second
      await clickFilterByTitle('Cluster');

      const clusterDeprecations = esDeprecationsMockResponse.migrationsDeprecations.filter(
        (deprecation) => deprecation.type === 'cluster_settings'
      );

      await waitFor(() =>
        expect(screen.getAllByTestId('deprecationTableRow')).toHaveLength(
          clusterDeprecations.length
        )
      );
    });

    it('filters results by query string', async () => {
      const multiFieldsDeprecation = esDeprecationsMockResponse.migrationsDeprecations[2];

      await setupPage();
      await setSearchInputValue(multiFieldsDeprecation.message);

      await waitFor(() => expect(screen.getAllByTestId('deprecationTableRow')).toHaveLength(1));
      expect(screen.getAllByTestId('deprecationTableRow')[0]).toHaveTextContent(
        multiFieldsDeprecation.message
      );
    });

    it('shows error for invalid search queries', async () => {
      await setupPage();

      await setSearchInputValue('%');

      expect(screen.getByTestId('invalidSearchQueryMessage')).toBeInTheDocument();
      expect(screen.getByTestId('invalidSearchQueryMessage')).toHaveTextContent('Invalid search');
    });

    it('shows message when search query does not return results', async () => {
      await setupPage();

      await setSearchInputValue('foobarbaz');

      expect(screen.getByTestId('noDeprecationsRow')).toBeInTheDocument();
      expect(screen.getByTestId('noDeprecationsRow')).toHaveTextContent(
        'No Elasticsearch deprecation issues found'
      );
    });
  });

  describe('pagination', () => {
    let user: ReturnType<typeof userEvent.setup>;

    const esDeprecationsMockResponseWithManyDeprecations = createEsDeprecationsMockResponse(20);
    const { migrationsDeprecations } = esDeprecationsMockResponseWithManyDeprecations;

    const getPaginationItemsCount = () => {
      const pagination = screen.getByTestId('esDeprecationsPagination');
      return pagination.querySelectorAll('.euiPagination__item').length;
    };

    const waitForStatusCellsToSettle = async () => {
      // Fast-path: if there is no loading placeholder visible, there is nothing to wait for.
      if (screen.queryAllByText('Loading status…').length === 0) {
        return;
      }
      await waitFor(() => {
        expect(screen.queryAllByText('Loading status…')).toHaveLength(0);
      });
    };

    beforeEach(() => {
      user = userEvent.setup();
      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(
        esDeprecationsMockResponseWithManyDeprecations
      );
      httpRequestsMockHelpers.setUpgradeMlSnapshotStatusResponse({
        nodeId: 'my_node',
        snapshotId: MOCK_SNAPSHOT_ID,
        jobId: MOCK_JOB_ID,
        status: 'idle',
      });
    });

    it('shows the correct number of pages and deprecations per page', async () => {
      await setupPage();

      expect(getPaginationItemsCount()).toEqual(
        Math.round(migrationsDeprecations.length / 50) // Default rows per page is 50
      );
      expect(screen.getAllByTestId('deprecationTableRow')).toHaveLength(50);

      // Navigate to the next page
      await user.click(screen.getByTestId('pagination-button-1'));

      // On the second (last) page, we expect to see the remaining deprecations
      await waitFor(() =>
        expect(screen.getAllByTestId('deprecationTableRow')).toHaveLength(
          migrationsDeprecations.length - 50
        )
      );
      await waitForStatusCellsToSettle();
    });

    it('allows the number of viewable rows to change', async () => {
      await setupPage();
      await user.click(screen.getByTestId('tablePaginationPopoverButton'));

      // Rows-per-page options are rendered in a portal; query the whole document.
      const rowsPerPageButton = await screen.findByTestId('tablePagination-100-rows');

      await user.click(rowsPerPageButton);

      await waitFor(() => {
        expect(getPaginationItemsCount()).toEqual(
          Math.round(migrationsDeprecations.length / 100) // Rows per page is now 100
        );
        expect(screen.getAllByTestId('deprecationTableRow')).toHaveLength(
          migrationsDeprecations.length
        );
      });
      await waitForStatusCellsToSettle();
    }, 7000);

    it('updates pagination when filters change', async () => {
      const criticalDeprecations = migrationsDeprecations.filter(
        (deprecation) => deprecation.level === 'critical'
      );

      await setupPage();

      // Status filter is the first filter button
      const searchBar = screen.getByTestId('searchBarContainer');
      const filterButtons = searchBar.querySelectorAll('button.euiFilterButton');
      await user.click(filterButtons[0] as HTMLButtonElement);

      const criticalFilterButton = await waitFor(() => {
        const el: HTMLButtonElement | null = document.body.querySelector(
          `.euiSelectableListItem[title="Critical"]`
        );
        expect(el).not.toBeNull();
        return el!;
      });

      await user.click(criticalFilterButton);

      // Only 40 critical deprecations, so only one page should show
      await waitFor(() => {
        expect(getPaginationItemsCount()).toEqual(1);
        expect(screen.getAllByTestId('deprecationTableRow')).toHaveLength(
          criticalDeprecations.length
        );
      });
      await waitForStatusCellsToSettle();
    }, 7000);

    it('updates pagination on search', async () => {
      const reindexDeprecations = migrationsDeprecations.filter(
        (deprecation) => deprecation.correctiveAction?.type === 'reindex'
      );

      await setupPage();

      const input = within(screen.getByTestId('searchBarContainer')).getByRole('searchbox');
      fireEvent.change(input, { target: { value: 'Index created before 7.0' } });
      fireEvent.keyUp(input, { target: { value: 'Index created before 7.0' } });

      // Only 20 deprecations that match, so only one page should show
      await waitFor(() => {
        expect(getPaginationItemsCount()).toEqual(1);
        expect(screen.getAllByTestId('deprecationTableRow')).toHaveLength(
          reindexDeprecations.length
        );
      });
      await waitForStatusCellsToSettle();
    });

    it('maintains correct row state across pagination', async () => {
      await setupPage();

      const getFirstRowMessageCellText = () => {
        const row = screen.getAllByTestId('deprecationTableRow')[0];
        const messageCell = row.querySelector('[data-test-subj$="-message"]');
        expect(messageCell).not.toBeNull();
        return messageCell!.textContent;
      };

      // Verify we have multiple pages
      expect(getPaginationItemsCount()).toBeGreaterThan(1);

      // Get the message of the first deprecation on page 1
      const firstDeprecationMessagePage1 = getFirstRowMessageCellText();

      // Navigate to page 2
      await user.click(screen.getByTestId('pagination-button-1'));

      // Wait for the first row message to change on page 2
      await waitFor(() => {
        expect(getFirstRowMessageCellText()).not.toEqual(firstDeprecationMessagePage1);
      });
      const firstDeprecationMessagePage2 = getFirstRowMessageCellText();

      // The first items on different pages should be different
      expect(firstDeprecationMessagePage1).not.toEqual(firstDeprecationMessagePage2);

      // Navigate back to page 1
      await user.click(screen.getByTestId('pagination-button-0'));

      // Verify the first deprecation on page 1 is still the same
      await waitFor(() => {
        expect(getFirstRowMessageCellText()).toEqual(firstDeprecationMessagePage1);
      });
      await waitForStatusCellsToSettle();
    });
  });

  describe('no deprecations', () => {
    beforeEach(() => {
      const noDeprecationsResponse = {
        totalCriticalDeprecations: 0,
        migrationsDeprecations: [],
        totalCriticalHealthIssues: 0,
        enrichedHealthIndicators: [],
      };

      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(noDeprecationsResponse);
    });

    test('renders prompt', async () => {
      await setupPage();

      expect(screen.getByTestId('noDeprecationsPrompt')).toBeInTheDocument();
      expect(screen.getByTestId('noDeprecationsPrompt')).toHaveTextContent(
        'Your Elasticsearch configuration is up to date'
      );
    });
  });

  describe('recommended actions for indices', () => {
    // Helper to DRY up repeated setup
    const setupRecommendedActionTest = async ({
      correctiveAction,
      reindexMeta = {},
      deprecationIndex = 3,
    }: {
      correctiveAction: any;
      reindexMeta?: Partial<any>;
      deprecationIndex?: number;
    }) => {
      httpRequestsMockHelpers.setLoadEsDeprecationsResponse({
        ...esDeprecationsMockResponse,
        migrationsDeprecations: esDeprecationsMockResponse.migrationsDeprecations.map(
          (deprecation, idx) =>
            idx === deprecationIndex
              ? ({
                  level: 'critical',
                  resolveDuringUpgrade: false,
                  type: 'index_settings',
                  message: 'Index created before 7.0',
                  details: 'deprecation details',
                  url: 'doc_url',
                  index: correctiveAction.index || 'reindex_index',
                  correctiveAction,
                } as EnrichedDeprecationInfo)
              : deprecation
        ),
      } as ESUpgradeStatus);

      if (correctiveAction.type === 'reindex' || correctiveAction.type === 'unfreeze') {
        httpRequestsMockHelpers.setReindexStatusResponse(
          correctiveAction.index || 'reindex_index',
          {
            reindexOp: null,
            warnings: [],
            hasRequiredPrivileges: true,
            meta: {
              indexName: reindexMeta.indexName || 'foo',
              reindexName: reindexMeta.reindexName || 'reindexed-foo',
              aliases: [],
              isFrozen: reindexMeta.isFrozen || false,
              isReadonly: reindexMeta.isReadonly || false,
              isInDataStream: reindexMeta.isInDataStream || false,
              isFollowerIndex: reindexMeta.isFollowerIndex || false,
              ...reindexMeta,
            },
          }
        );
      }

      await setupPage();
    };

    it('recommends set unfreeze if index is frozen', async () => {
      await setupRecommendedActionTest({
        correctiveAction: {
          type: 'unfreeze',
          index: 'reindex_index',
          metadata: {
            isClosedIndex: false,
            isFrozenIndex: true,
            isInDataStream: false,
          },
        },
      });
      expect(screen.getAllByTestId('reindexTableCell-correctiveAction')).toHaveLength(1);
      expect(screen.getByTestId('reindexTableCell-correctiveAction')).toHaveTextContent(
        'Recommended: unfreeze'
      );
    });

    it('recommends set as read-only if index is a follower index', async () => {
      await setupRecommendedActionTest({
        correctiveAction: {
          type: 'reindex',
          index: 'reindex_index',
          metadata: {
            isClosedIndex: false,
            isFrozenIndex: false,
            isInDataStream: false,
          },
        },
        reindexMeta: {
          isFollowerIndex: true,
          indexName: 'follower-index',
          reindexName: 'reindexed-follower-index',
        },
      });
      expect(screen.getAllByTestId('reindexTableCell-correctiveAction')).toHaveLength(1);
      expect(screen.getByTestId('reindexTableCell-correctiveAction')).toHaveTextContent(
        'Recommended: set to read-only'
      );
    });

    it('recommends set as read-only if index is bigger than 1GB', async () => {
      await setupRecommendedActionTest({
        correctiveAction: {
          type: 'reindex',
          index: 'reindex_index',
          indexSizeInBytes: 1173741824, // > 1GB
          metadata: {
            isClosedIndex: false,
            isFrozenIndex: false,
            isInDataStream: false,
          },
        },
        reindexMeta: {
          indexName: 'large-index',
          reindexName: 'reindexed-large-index',
        },
      });
      expect(screen.getAllByTestId('reindexTableCell-correctiveAction')).toHaveLength(1);
      expect(screen.getByTestId('reindexTableCell-correctiveAction')).toHaveTextContent(
        'Recommended: set to read-only'
      );
    });

    it('recommends reindexing if index is already read-only', async () => {
      await setupRecommendedActionTest({
        correctiveAction: {
          type: 'reindex',
          index: 'reindex_index',
          metadata: {
            isClosedIndex: false,
            isFrozenIndex: false,
            isInDataStream: false,
          },
        },
        reindexMeta: {
          isReadonly: true,
          indexName: 'readonly-index',
          reindexName: 'reindexed-readonly-index',
        },
      });
      expect(screen.getAllByTestId('reindexTableCell-correctiveAction')).toHaveLength(1);
      expect(screen.getByTestId('reindexTableCell-correctiveAction')).toHaveTextContent(
        'Recommended: reindex'
      );
    });

    it('recommends set as read-only if reindexing is excluded', async () => {
      await setupRecommendedActionTest({
        correctiveAction: {
          type: 'reindex',
          index: 'reindex_index',
          excludedActions: ['readOnly'],
          metadata: {
            isClosedIndex: false,
            isFrozenIndex: false,
            isInDataStream: false,
          },
        },
        reindexMeta: {
          indexName: 'excluded-index',
          reindexName: 'reindexed-excluded-index',
        },
      });
      expect(screen.getAllByTestId('reindexTableCell-correctiveAction')).toHaveLength(1);
      expect(screen.getByTestId('reindexTableCell-correctiveAction')).toHaveTextContent(
        'Recommended: reindex'
      );
    });

    it('recommends manual fix if follower index and already read-only', async () => {
      await setupRecommendedActionTest({
        correctiveAction: {
          type: 'reindex',
          index: 'large_and_readonly_index',
          metadata: {
            isClosedIndex: false,
            isFrozenIndex: false,
            isInDataStream: false,
          },
        },
        reindexMeta: {
          isFollowerIndex: true,
          isReadonly: true,
          indexName: 'large_and_readonly_index',
          reindexName: 'reindexed-large_and_readonly_index',
        },
      });
      expect(screen.getAllByTestId('reindexTableCell-correctiveAction')).toHaveLength(1);
      expect(screen.getByTestId('reindexTableCell-correctiveAction')).toHaveTextContent(
        'Resolve manually'
      );
    });
    it('recommends reindexing by default', async () => {
      await setupRecommendedActionTest({
        correctiveAction: {
          type: 'reindex',
          index: 'reindex_index',
          metadata: {
            isClosedIndex: false,
            isFrozenIndex: false,
            isInDataStream: false,
          },
        },
      });
      expect(screen.getAllByTestId('reindexTableCell-correctiveAction')).toHaveLength(1);
      expect(screen.getByTestId('reindexTableCell-correctiveAction')).toHaveTextContent(
        'Recommended: reindex'
      );
    });
  });
  describe('recommended actions for data streams', () => {
    it('recommends read-only by default', async () => {
      await setupPage();

      expect(
        screen.getAllByTestId('dataStreamReindexTableCell-correctiveAction')[0]
      ).toHaveTextContent('Recommended: set to read-only');
    });

    it('recommends reindexing if read-only is excluded', async () => {
      await setupPage();

      expect(
        screen.getAllByTestId('dataStreamReindexTableCell-correctiveAction')[1]
      ).toHaveTextContent('Recommended: reindex');
    });
  });

  describe('action buttons', () => {
    describe('frozen indices', () => {
      beforeEach(() => {
        httpRequestsMockHelpers.setLoadEsDeprecationsResponse({
          ...esDeprecationsMockResponse,
          migrationsDeprecations: esDeprecationsMockResponse.migrationsDeprecations.map(
            (deprecation) =>
              deprecation === esDeprecationsMockResponse.migrationsDeprecations[3]
                ? ({
                    level: 'critical',
                    resolveDuringUpgrade: false,
                    type: 'index_settings',
                    message: 'Index created before 7.0',
                    details: 'deprecation details',
                    url: 'doc_url',
                    index: 'reindex_index',
                    correctiveAction: {
                      type: 'unfreeze',
                      metadata: {
                        isClosedIndex: false,
                        isFrozenIndex: true,
                        isInDataStream: false,
                      },
                    } as UnfreezeAction,
                  } as EnrichedDeprecationInfo)
                : deprecation
          ),
        } as ESUpgradeStatus);

        httpRequestsMockHelpers.setUpdateIndexResponse(
          esDeprecationsMockResponse.migrationsDeprecations[3].index!,
          { data: '', error: null }
        );
      });
      it('it displays reindexing and unfreeze button for frozen index', async () => {
        await setupPage();

        expect(screen.getAllByTestId('reindexTableCell-actions')).toHaveLength(1);

        expect(screen.queryByTestId('deprecation-unfreeze-unfreeze')).not.toBeNull();
        expect(screen.queryByTestId('deprecation-unfreeze-reindex')).not.toBeNull();
      });
      it('it only displays reindexing button if reindex in progress', async () => {
        httpRequestsMockHelpers.setReindexStatusResponse(
          esDeprecationsMockResponse.migrationsDeprecations[3].index!,
          {
            reindexOp: {
              status: ReindexStatus.inProgress,
              lastCompletedStep: ReindexStep.readonly,
              reindexTaskPercComplete: null,
            },
            warnings: [],
            hasRequiredPrivileges: true,
            meta: {
              indexName: 'foo',
              reindexName: 'reindexed-foo',
              aliases: [],
              isFrozen: false,
              isReadonly: false,
              isInDataStream: false,
              isFollowerIndex: false,
            },
          }
        );

        await setupPage();

        // Ensure the async status load has completed before the test ends (prevents act warnings
        // from a pending updateStatus() resolving after unmount).
        await waitFor(() => {
          expect(screen.getByText(/Reindexing in progress/)).toBeInTheDocument();
        });

        expect(screen.getAllByTestId('reindexTableCell-actions')).toHaveLength(1);

        expect(screen.queryByTestId('deprecation-unfreeze-unfreeze')).toBeNull();
        expect(screen.queryByTestId('deprecation-unfreeze-reindex')).not.toBeNull();
      });
      it('it only displays unfreeze button if unfreezing in progress', async () => {
        await setupPage();

        fireEvent.click(screen.getAllByTestId('deprecation-unfreeze-unfreeze')[0]);
        const modal = await screen.findByTestId('updateIndexModal');
        fireEvent.click(within(modal).getByTestId('startIndexUnfreezeButton'));

        expect(screen.getAllByTestId('reindexTableCell-actions')).toHaveLength(1);

        await waitFor(() => {
          expect(screen.queryByTestId('deprecation-unfreeze-unfreeze')).not.toBeNull();
          expect(screen.queryByTestId('deprecation-unfreeze-reindex')).toBeNull();
        });
      });
    });
    describe('reindexing indices', () => {
      const setupReindexingTest = async ({
        excludedActions = [],
        index = 'reindex_index',
        metaOverrides = {},
      }: {
        excludedActions?: string[];
        index?: string;
        metaOverrides?: Partial<any>;
      } = {}) => {
        httpRequestsMockHelpers.setLoadEsDeprecationsResponse({
          ...esDeprecationsMockResponse,
          migrationsDeprecations: esDeprecationsMockResponse.migrationsDeprecations.map(
            (deprecation) =>
              deprecation === esDeprecationsMockResponse.migrationsDeprecations[3]
                ? ({
                    level: 'critical',
                    resolveDuringUpgrade: false,
                    type: 'index_settings',
                    message: 'Index created before 7.0',
                    details: 'deprecation details',
                    url: 'doc_url',
                    index,
                    correctiveAction: {
                      type: 'reindex',
                      excludedActions,
                      metadata: {
                        isClosedIndex: false,
                        isFrozenIndex: false,
                        isInDataStream: false,
                        ...metaOverrides,
                      },
                    } as ReindexAction,
                  } as EnrichedDeprecationInfo)
                : deprecation
          ),
        } as ESUpgradeStatus);

        httpRequestsMockHelpers.setReindexStatusResponse(index, {
          reindexOp: null,
          warnings: [],
          hasRequiredPrivileges: true,
          meta: {
            indexName: 'excluded-index',
            reindexName: 'reindexed-excluded-index',
            aliases: [],
            isFrozen: false,
            isReadonly: false,
            isInDataStream: false,
            isFollowerIndex: false,
            ...metaOverrides,
          },
        });

        await setupPage();
      };

      it('it displays reindexing and readonly for indices if both are valid', async () => {
        await setupReindexingTest();
        expect(screen.getAllByTestId('reindexTableCell-actions')).toHaveLength(1);
        expect(screen.queryByTestId('deprecation-reindex-readonly')).not.toBeNull();
        expect(screen.queryByTestId('deprecation-reindex-reindex')).not.toBeNull();
      });
      it('only displays read-only button if reindexing is excluded', async () => {
        await setupReindexingTest({ excludedActions: ['readOnly'] });
        expect(screen.getAllByTestId('reindexTableCell-actions')).toHaveLength(1);
        expect(screen.queryByTestId('deprecation-reindex-readonly')).toBeNull();
        expect(screen.queryByTestId('deprecation-reindex-reindex')).not.toBeNull();
      });
      it('only displays read-only button if index is a follower index', async () => {
        await setupReindexingTest({ metaOverrides: { isFollowerIndex: true } });
        expect(screen.getAllByTestId('reindexTableCell-actions')).toHaveLength(1);
        expect(screen.queryByTestId('deprecation-reindex-readonly')).not.toBeNull();
        expect(screen.queryByTestId('deprecation-reindex-reindex')).toBeNull();
      });
      it('only displays reindex button if read-only is excluded', async () => {
        await setupReindexingTest({
          excludedActions: ['reindex'],
          index: 'readonly_index',
        });
        expect(screen.getAllByTestId('reindexTableCell-actions')).toHaveLength(1);
        expect(screen.queryByTestId('deprecation-reindex-readonly')).not.toBeNull();
        expect(screen.queryByTestId('deprecation-reindex-reindex')).toBeNull();
      });
      it('it only displays readonly button if readonly in progress', async () => {
        await setupReindexingTest();

        fireEvent.click(screen.getAllByTestId('deprecation-reindex-readonly')[0]);
        const modal = await screen.findByTestId('updateIndexModal');
        fireEvent.click(within(modal).getByTestId('startIndexReadonlyButton'));

        await waitFor(() => {
          expect(screen.queryByTestId('deprecation-reindex-readonly')).not.toBeNull();
          expect(screen.queryByTestId('deprecation-reindex-reindex')).toBeNull();
        });
      });
    });
  });
  describe('datastreams', () => {
    const defaultMigrationResponse = {
      hasRequiredPrivileges: true,
      migrationOp: { status: DataStreamMigrationStatus.notStarted },
      warnings: [
        {
          warningType: 'incompatibleDataStream',
          resolutionType: 'reindex',
        },
        {
          warningType: 'incompatibleDataStream',
          resolutionType: 'readonly',
        },
      ],
    };
    beforeEach(() => {
      httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
        MOCK_DS_DEPRECATION.index!,
        defaultMigrationResponse
      );
      httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
        MOCK_DS_DEPRECATION_READ_ONLY.index!,
        defaultMigrationResponse
      );

      httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
        MOCK_DS_DEPRECATION_REINDEX.index!,
        defaultMigrationResponse
      );
    });

    it('displays read-only and reindex depending if both are valid', async () => {
      await setupPage();

      const actionsCell = screen.getAllByTestId('dataStreamReindexTableCell-actions')[0];
      expect(within(actionsCell).queryByTestId('deprecation-dataStream-reindex')).not.toBeNull();
      expect(within(actionsCell).queryByTestId('deprecation-dataStream-readonly')).not.toBeNull();
    });

    it('recommends reindexing if read-only is excluded', async () => {
      await setupPage();

      const actionsCell = screen.getAllByTestId('dataStreamReindexTableCell-actions')[1];
      expect(within(actionsCell).queryByTestId('deprecation-dataStream-reindex')).not.toBeNull();
      expect(within(actionsCell).queryByTestId('deprecation-dataStream-readonly')).toBeNull();
    });

    it('recommends readonly if reindex is excluded', async () => {
      await setupPage();

      const actionsCell = screen.getAllByTestId('dataStreamReindexTableCell-actions')[2];
      expect(within(actionsCell).queryByTestId('deprecation-dataStream-reindex')).toBeNull();
      expect(within(actionsCell).queryByTestId('deprecation-dataStream-readonly')).not.toBeNull();
    });
    it('only displays reindex button if reindexing is in progress', async () => {
      httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(MOCK_DS_DEPRECATION.index!, {
        hasRequiredPrivileges: true,
        migrationOp: {
          resolutionType: 'reindex',
          status: DataStreamMigrationStatus.inProgress,
          taskPercComplete: 1,
          progressDetails: {
            startTimeMs: Date.now() - 10000, // now - 10 seconds
            successCount: 0,
            pendingCount: 1,
            inProgressCount: 0,
            errorsCount: 0,
          },
        },
        warnings: [
          {
            warningType: 'incompatibleDataStream',
            resolutionType: 'reindex',
          },
        ],
      });
      await setupPage();

      const actionsCell = screen.getAllByTestId('dataStreamReindexTableCell-actions')[0];
      expect(within(actionsCell).queryByTestId('deprecation-dataStream-reindex')).not.toBeNull();
      expect(within(actionsCell).queryByTestId('deprecation-dataStream-readonly')).toBeNull();
    });
    it('only displays readonly button if setting read-only is in progress', async () => {
      httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(MOCK_DS_DEPRECATION.index!, {
        hasRequiredPrivileges: true,
        migrationOp: {
          resolutionType: 'readonly',
          status: DataStreamMigrationStatus.inProgress,
          taskPercComplete: 1,
          progressDetails: {
            startTimeMs: Date.now() - 10000, // now - 10 seconds
            successCount: 0,
            pendingCount: 1,
            inProgressCount: 0,
            errorsCount: 0,
          },
        },
        warnings: [
          {
            warningType: 'incompatibleDataStream',
            resolutionType: 'readonly',
          },
        ],
      });
      await setupPage();

      const actionsCell = screen.getAllByTestId('dataStreamReindexTableCell-actions')[0];
      expect(within(actionsCell).queryByTestId('deprecation-dataStream-reindex')).toBeNull();
      expect(within(actionsCell).queryByTestId('deprecation-dataStream-readonly')).not.toBeNull();
    });
  });
});
