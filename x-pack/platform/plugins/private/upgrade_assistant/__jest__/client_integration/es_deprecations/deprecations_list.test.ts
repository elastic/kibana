/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { API_BASE_PATH } from '../../../common/constants';
import {
  ReindexStep,
  ESUpgradeStatus,
  EnrichedDeprecationInfo,
  MlAction,
  ReindexAction,
  UnfreezeAction,
  ReindexStatus,
  DataStreamMigrationStatus,
} from '../../../common/types';
import { setupEnvironment } from '../helpers';
import { ElasticsearchTestBed, setupElasticsearchPage } from './es_deprecations.helpers';
import {
  esDeprecationsMockResponse,
  MOCK_SNAPSHOT_ID,
  MOCK_JOB_ID,
  createEsDeprecationsMockResponse,
  MOCK_DS_DEPRECATION,
  MOCK_DS_DEPRECATION_REINDEX,
  MOCK_DS_DEPRECATION_READ_ONLY,
} from './mocked_responses';

describe('ES deprecations table', () => {
  let testBed: ElasticsearchTestBed;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(async () => {
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

    await act(async () => {
      testBed = await setupElasticsearchPage(httpSetup);
    });

    testBed.component.update();
  });

  it('renders deprecations', () => {
    const { exists, find } = testBed;
    // Verify container exists
    expect(exists('esDeprecationsContent')).toBe(true);

    // Verify all deprecations appear in the table
    expect(find('deprecationTableRow').length).toEqual(
      esDeprecationsMockResponse.migrationsDeprecations.length
    );
  });

  it('refreshes deprecation data', async () => {
    const { actions } = testBed;

    await actions.table.clickRefreshButton();

    const mlDeprecation = esDeprecationsMockResponse.migrationsDeprecations[0];
    const reindexDeprecation = esDeprecationsMockResponse.migrationsDeprecations[3];

    // Since upgradeStatusMockResponse includes ML and reindex actions (which require fetching status), there will be 4 requests made
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
      `${API_BASE_PATH}/reindex/${reindexDeprecation.index}`,
      expect.anything()
    );

    expect(httpSetup.get).toHaveBeenCalledWith(
      `${API_BASE_PATH}/ml_upgrade_mode`,
      expect.anything()
    );
  });

  it('shows critical and warning deprecations count', () => {
    const { find } = testBed;
    const criticalDeprecations = esDeprecationsMockResponse.migrationsDeprecations.filter(
      (deprecation) => deprecation.level === 'critical'
    );
    const warningDeprecations = esDeprecationsMockResponse.migrationsDeprecations.filter(
      (deprecation) => deprecation.level !== 'critical'
    );

    expect(find('criticalDeprecationsCount').text()).toContain(String(criticalDeprecations.length));

    expect(find('warningDeprecationsCount').text()).toContain(String(warningDeprecations.length));
  });

  describe('remote clusters callout', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRemoteClustersResponse(['test_remote_cluster']);

      await act(async () => {
        testBed = await setupElasticsearchPage(httpSetup);
      });

      testBed.component.update();
    });

    it('shows a warning message if a user has remote clusters configured', () => {
      const { exists } = testBed;

      // Verify warning exists
      expect(exists('remoteClustersWarningCallout')).toBe(true);
    });
  });

  describe('search bar', () => {
    it('filters results by status', async () => {
      const { find, actions } = testBed;

      await actions.searchBar.clickStatusFilterDropdown();
      await actions.searchBar.clickFilterByTitle('Critical');

      const criticalDeprecations = esDeprecationsMockResponse.migrationsDeprecations.filter(
        (deprecation) => deprecation.level === 'critical'
      );

      expect(find('deprecationTableRow').length).toEqual(criticalDeprecations.length);

      await actions.searchBar.clickStatusFilterDropdown();
      await actions.searchBar.clickFilterByTitle('Critical'); // Reset filter

      expect(find('deprecationTableRow').length).toEqual(
        esDeprecationsMockResponse.migrationsDeprecations.length
      );
    });

    it('filters results by type', async () => {
      const { find, actions } = testBed;

      await actions.searchBar.clickTypeFilterDropdown();

      await actions.searchBar.clickFilterByTitle('Cluster');

      const clusterDeprecations = esDeprecationsMockResponse.migrationsDeprecations.filter(
        (deprecation) => deprecation.type === 'cluster_settings'
      );

      expect(find('deprecationTableRow').length).toEqual(clusterDeprecations.length);
    });

    it('filters results by query string', async () => {
      const { find, actions } = testBed;
      const multiFieldsDeprecation = esDeprecationsMockResponse.migrationsDeprecations[2];

      await actions.searchBar.setSearchInputValue(multiFieldsDeprecation.message);

      expect(find('deprecationTableRow').length).toEqual(1);
      expect(find('deprecationTableRow').at(0).text()).toContain(multiFieldsDeprecation.message);
    });

    it('shows error for invalid search queries', async () => {
      const { find, exists, actions } = testBed;

      await actions.searchBar.setSearchInputValue('%');

      expect(exists('invalidSearchQueryMessage')).toBe(true);
      expect(find('invalidSearchQueryMessage').text()).toContain('Invalid search');
    });

    it('shows message when search query does not return results', async () => {
      const { find, actions, exists } = testBed;

      await actions.searchBar.setSearchInputValue('foobarbaz');

      expect(exists('noDeprecationsRow')).toBe(true);
      expect(find('noDeprecationsRow').text()).toContain(
        'No Elasticsearch deprecation issues found'
      );
    });
  });

  describe('pagination', () => {
    const esDeprecationsMockResponseWithManyDeprecations = createEsDeprecationsMockResponse(20);
    const { migrationsDeprecations } = esDeprecationsMockResponseWithManyDeprecations;

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(
        esDeprecationsMockResponseWithManyDeprecations
      );
      httpRequestsMockHelpers.setUpgradeMlSnapshotStatusResponse({
        nodeId: 'my_node',
        snapshotId: MOCK_SNAPSHOT_ID,
        jobId: MOCK_JOB_ID,
        status: 'idle',
      });

      await act(async () => {
        testBed = await setupElasticsearchPage(httpSetup);
      });

      testBed.component.update();
    });

    it('shows the correct number of pages and deprecations per page', async () => {
      const { find, actions } = testBed;

      expect(find('esDeprecationsPagination').find('.euiPagination__item').length).toEqual(
        Math.round(migrationsDeprecations.length / 50) // Default rows per page is 50
      );
      expect(find('deprecationTableRow').length).toEqual(50);

      // Navigate to the next page
      await actions.pagination.clickPaginationAt(1);

      // On the second (last) page, we expect to see the remaining deprecations
      expect(find('deprecationTableRow').length).toEqual(migrationsDeprecations.length - 50);
    });

    it('allows the number of viewable rows to change', async () => {
      const { find, actions, component } = testBed;

      await actions.pagination.clickRowsPerPageDropdown();

      // We need to read the document "body" as the rows-per-page dropdown options are added there and not inside
      // the component DOM tree.
      const rowsPerPageButton: HTMLButtonElement | null = document.body.querySelector(
        '[data-test-subj="tablePagination-100-rows"]'
      );

      expect(rowsPerPageButton).not.toBeNull();

      await act(async () => {
        rowsPerPageButton!.click();
      });

      component.update();

      expect(find('esDeprecationsPagination').find('.euiPagination__item').length).toEqual(
        Math.round(migrationsDeprecations.length / 100) // Rows per page is now 100
      );
      expect(find('deprecationTableRow').length).toEqual(migrationsDeprecations.length);
    });

    it('updates pagination when filters change', async () => {
      const { actions, find } = testBed;

      const criticalDeprecations = migrationsDeprecations.filter(
        (deprecation) => deprecation.level === 'critical'
      );

      await actions.searchBar.clickStatusFilterDropdown();
      await actions.searchBar.clickFilterByTitle('Critical');

      // Only 40 critical deprecations, so only one page should show
      expect(find('esDeprecationsPagination').find('.euiPagination__item').length).toEqual(1);
      expect(find('deprecationTableRow').length).toEqual(criticalDeprecations.length);
    });

    it('updates pagination on search', async () => {
      const { actions, find } = testBed;
      const reindexDeprecations = migrationsDeprecations.filter(
        (deprecation) => deprecation.correctiveAction?.type === 'reindex'
      );

      await actions.searchBar.setSearchInputValue('Index created before 7.0');

      // Only 20 deprecations that match, so only one page should show
      expect(find('esDeprecationsPagination').find('.euiPagination__item').length).toEqual(1);
      expect(find('deprecationTableRow').length).toEqual(reindexDeprecations.length);
    });

    it('maintains correct row state across pagination', async () => {
      const { find, actions } = testBed;

      // Verify we have multiple pages
      expect(find('esDeprecationsPagination').find('.euiPagination__item').length).toBeGreaterThan(
        1
      );

      // Get the message of the first deprecation on page 1
      const firstDeprecationMessagePage1 = find('deprecationTableRow').at(0).text();

      // Navigate to page 2
      await actions.pagination.clickPaginationAt(1);

      // Get the message of the first deprecation on page 2
      const firstDeprecationMessagePage2 = find('deprecationTableRow').at(0).text();

      // The first items on different pages should be different
      expect(firstDeprecationMessagePage1).not.toEqual(firstDeprecationMessagePage2);

      // Navigate back to page 1
      await actions.pagination.clickPaginationAt(0);

      // Verify the first deprecation on page 1 is still the same
      const firstDeprecationMessagePage1Again = find('deprecationTableRow').at(0).text();
      expect(firstDeprecationMessagePage1Again).toEqual(firstDeprecationMessagePage1);
    });
  });

  describe('no deprecations', () => {
    beforeEach(async () => {
      const noDeprecationsResponse = {
        totalCriticalDeprecations: 0,
        migrationsDeprecations: [],
        totalCriticalHealthIssues: 0,
        enrichedHealthIndicators: [],
      };

      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(noDeprecationsResponse);

      await act(async () => {
        testBed = await setupElasticsearchPage(httpSetup);
      });

      testBed.component.update();
    });

    test('renders prompt', () => {
      const { exists, find } = testBed;
      expect(exists('noDeprecationsPrompt')).toBe(true);
      expect(find('noDeprecationsPrompt').text()).toContain(
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

      await act(async () => {
        testBed = await setupElasticsearchPage(httpSetup);
      });
      testBed.component.update();
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
      const { find } = testBed;
      expect(find('reindexTableCell-correctiveAction').length).toBe(1);
      expect(find('reindexTableCell-correctiveAction').text()).toContain('Recommended: unfreeze');
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
      const { find } = testBed;
      expect(find('reindexTableCell-correctiveAction').length).toBe(1);
      expect(find('reindexTableCell-correctiveAction').text()).toContain(
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
      const { find } = testBed;
      expect(find('reindexTableCell-correctiveAction').length).toBe(1);
      expect(find('reindexTableCell-correctiveAction').text()).toContain(
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
      const { find } = testBed;
      expect(find('reindexTableCell-correctiveAction').length).toBe(1);
      expect(find('reindexTableCell-correctiveAction').text()).toContain('Recommended: reindex');
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
      const { find } = testBed;
      expect(find('reindexTableCell-correctiveAction').length).toBe(1);
      expect(find('reindexTableCell-correctiveAction').text()).toContain('Recommended: reindex');
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
      const { find } = testBed;
      expect(find('reindexTableCell-correctiveAction').length).toBe(1);
      expect(find('reindexTableCell-correctiveAction').text()).toContain('Resolve manually');
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
      const { find } = testBed;
      expect(find('reindexTableCell-correctiveAction').length).toBe(1);
      expect(find('reindexTableCell-correctiveAction').text()).toContain('Recommended: reindex');
    });
  });
  describe('recommended actions for data streams', () => {
    it('recommends read-only by default', async () => {
      const { find } = testBed;

      expect(find('dataStreamReindexTableCell-correctiveAction').at(0).text()).toContain(
        'Recommended: set to read-only'
      );
    });

    it('recommends reindexing if read-only is excluded', async () => {
      const { find } = testBed;

      expect(find('dataStreamReindexTableCell-correctiveAction').at(1).text()).toContain(
        'Recommended: reindex'
      );
    });
  });

  describe('action buttons', () => {
    describe('frozen indices', () => {
      beforeEach(async () => {
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

        await act(async () => {
          testBed = await setupElasticsearchPage(httpSetup);
        });
        testBed.component.update();
      });
      it('it displays reindexing and unfreeze button for frozen index', async () => {
        const { find, exists } = testBed;

        expect(find('reindexTableCell-actions').length).toBe(1);

        expect(exists('deprecation-unfreeze-unfreeze')).toBe(true);
        expect(exists('deprecation-unfreeze-reindex')).toBe(true);
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

        await act(async () => {
          testBed = await setupElasticsearchPage(httpSetup);
        });
        testBed.component.update();
        const { find, exists } = testBed;
        expect(find('reindexTableCell-actions').length).toBe(1);

        expect(exists('deprecation-unfreeze-unfreeze')).toBe(false);
        expect(exists('deprecation-unfreeze-reindex')).toBe(true);
      });
      it('it only displays unfreeze button if unfreezing in progress', async () => {
        const { find, exists, actions } = testBed;

        await actions.table.clickDeprecationRowAt({
          deprecationType: 'unfreeze',
          index: 0,
          action: 'unfreeze',
        });
        await actions.reindexDeprecationFlyout.clickUnfreezeButton();

        expect(find('reindexTableCell-actions').length).toBe(1);

        expect(exists('deprecation-unfreeze-unfreeze')).toBe(true);
        expect(exists('deprecation-unfreeze-reindex')).toBe(false);
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

        await act(async () => {
          testBed = await setupElasticsearchPage(httpSetup);
        });
        testBed.component.update();
      };

      it('it displays reindexing and readonly for indices if both are valid', async () => {
        await setupReindexingTest();
        const { find, exists } = testBed;
        expect(find('reindexTableCell-actions').length).toBe(1);
        expect(exists('deprecation-reindex-readonly')).toBe(true);
        expect(exists('deprecation-reindex-reindex')).toBe(true);
      });
      it('only displays read-only button if reindexing is excluded', async () => {
        await setupReindexingTest({ excludedActions: ['readOnly'] });
        const { find, exists } = testBed;
        expect(find('reindexTableCell-actions').length).toBe(1);
        expect(exists('deprecation-reindex-readonly')).toBe(false);
        expect(exists('deprecation-reindex-reindex')).toBe(true);
      });
      it('only displays read-only button if index is a follower index', async () => {
        await setupReindexingTest({ metaOverrides: { isFollowerIndex: true } });
        const { find, exists } = testBed;
        expect(find('reindexTableCell-actions').length).toBe(1);
        expect(exists('deprecation-reindex-readonly')).toBe(true);
        expect(exists('deprecation-reindex-reindex')).toBe(false);
      });
      it('only displays reindex button if read-only is excluded', async () => {
        await setupReindexingTest({
          excludedActions: ['reindex'],
          index: 'readonly_index',
        });
        const { find, exists } = testBed;
        expect(find('reindexTableCell-actions').length).toBe(1);
        expect(exists('deprecation-reindex-readonly')).toBe(true);
        expect(exists('deprecation-reindex-reindex')).toBe(false);
      });
      it('it only displays readonly button if readonly in progress', async () => {
        const { exists, actions } = testBed;
        await actions.table.clickDeprecationRowAt({
          deprecationType: 'reindex',
          index: 0,
          action: 'readonly',
        });
        await actions.reindexDeprecationFlyout.clickReadOnlyButton();

        expect(exists('deprecation-reindex-readonly')).toBe(true);
        expect(exists('deprecation-reindex-reindex')).toBe(false);
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
    beforeEach(async () => {
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
      await act(async () => {
        testBed = await setupElasticsearchPage(httpSetup);
      });

      testBed.component.update();
    });

    it('displays read-only and reindex depending if both are valid', async () => {
      const { find } = testBed;
      const actionsCell = find('dataStreamReindexTableCell-actions').at(0);

      expect(actionsCell.find('[data-test-subj="deprecation-dataStream-reindex"]').exists()).toBe(
        true
      );
      expect(actionsCell.find('[data-test-subj="deprecation-dataStream-readonly"]').exists()).toBe(
        true
      );
    });

    it('recommends reindexing if read-only is excluded', async () => {
      const { find } = testBed;

      const actionsCell = find('dataStreamReindexTableCell-actions').at(1);

      expect(actionsCell.find('[data-test-subj="deprecation-dataStream-reindex"]').exists()).toBe(
        true
      );
      expect(actionsCell.find('[data-test-subj="deprecation-dataStream-readonly"]').exists()).toBe(
        false
      );
    });

    it('recommends readonly if reindex is excluded', async () => {
      const { find } = testBed;

      const actionsCell = find('dataStreamReindexTableCell-actions').at(2);

      expect(actionsCell.find('[data-test-subj="deprecation-dataStream-reindex"]').exists()).toBe(
        false
      );
      expect(actionsCell.find('[data-test-subj="deprecation-dataStream-readonly"]').exists()).toBe(
        true
      );
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
      await act(async () => {
        testBed = await setupElasticsearchPage(httpSetup);
      });

      testBed.component.update();
      const { find } = testBed;

      const actionsCell = find('dataStreamReindexTableCell-actions').at(0);

      expect(actionsCell.find('[data-test-subj="deprecation-dataStream-reindex"]').exists()).toBe(
        true
      );
      expect(actionsCell.find('[data-test-subj="deprecation-dataStream-readonly"]').exists()).toBe(
        false
      );
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
      await act(async () => {
        testBed = await setupElasticsearchPage(httpSetup);
      });

      testBed.component.update();
      const { find } = testBed;

      const actionsCell = find('dataStreamReindexTableCell-actions').at(0);

      expect(actionsCell.find('[data-test-subj="deprecation-dataStream-reindex"]').exists()).toBe(
        false
      );
      expect(actionsCell.find('[data-test-subj="deprecation-dataStream-readonly"]').exists()).toBe(
        true
      );
    });
  });
});
