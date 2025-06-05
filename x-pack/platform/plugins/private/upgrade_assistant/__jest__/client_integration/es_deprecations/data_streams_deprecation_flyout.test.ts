/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import moment from 'moment';

import numeral from '@elastic/numeral';
import { setupEnvironment } from '../helpers';
import { ElasticsearchTestBed, setupElasticsearchPage } from './es_deprecations.helpers';
import {
  esDeprecationsMockResponse,
  MOCK_DS_DEPRECATION,
  MOCK_REINDEX_DEPRECATION,
  MOCK_DS_DEPRECATION_REINDEX,
  MOCK_DS_DEPRECATION_READ_ONLY,
} from './mocked_responses';
import { DataStreamMigrationStatus } from '../../../common/data_stream_types';

const DATE_FORMAT = 'dddd, MMMM Do YYYY, h:mm:ss a';
const FILE_SIZE_DISPLAY_FORMAT = '0,0.[0] b';

const defaultMetaResponse = {
  dataStreamName: MOCK_DS_DEPRECATION.index!,
  documentationUrl: MOCK_DS_DEPRECATION.url,
  lastIndexRequiringUpgradeCreationDate: 1483228800000,
  allIndices: ['ds_index'],
  allIndicesCount: 1,
  indicesRequiringUpgradeCount: 1,
  indicesRequiringUpgrade: ['ds_index'],
  indicesRequiringUpgradeDocsSize: 51200,
  indicesRequiringUpgradeDocsCount: 12,
};

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

describe('Data streams deprecation flyout', () => {
  let testBed: ElasticsearchTestBed;

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;

    httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esDeprecationsMockResponse);
    httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
      MOCK_DS_DEPRECATION.index!,
      defaultMigrationResponse
    );

    httpRequestsMockHelpers.setDataStreamMetadataResponse(
      MOCK_DS_DEPRECATION.index!,
      defaultMetaResponse
    );

    httpRequestsMockHelpers.setReindexStatusResponse(MOCK_REINDEX_DEPRECATION.index!, {
      reindexOp: null,
      warnings: [],
      hasRequiredPrivileges: true,
      meta: {
        indexName: 'foo',
        reindexName: 'reindexed-foo',
        aliases: [],
      },
    });

    await act(async () => {
      testBed = await setupElasticsearchPage(httpSetup);
    });

    testBed.component.update();
  });

  it('opens a flyout when clicking on a data stream row', async () => {
    const { actions, exists } = testBed;

    await actions.table.clickDeprecationRowAt('dataStream', 0);
    expect(exists('reindexDataStreamDetails')).toBe(true);
    await actions.dataStreamDeprecationFlyout.closeFlyout();
    expect(exists('reindexDataStreamDetails')).toBe(false);
  });

  it('renders a flyout with data stream details for both reindex and read-only', async () => {
    const dataStreamDeprecation = esDeprecationsMockResponse.migrationsDeprecations[5];
    const { actions, find, exists } = testBed;

    await actions.table.clickDeprecationRowAt('dataStream', 0);

    expect(exists('reindexDataStreamDetails')).toBe(true);
    expect(find('reindexDataStreamDetails.flyoutTitle').text()).toBe(
      `${dataStreamDeprecation.index}`
    );

    expect(exists('dataStreamLastIndexCreationDate')).toBe(true);
    expect(find('dataStreamLastIndexCreationDate').text()).toBe(
      `Migration required for indices created on or before${moment(
        defaultMetaResponse.lastIndexRequiringUpgradeCreationDate
      ).format(DATE_FORMAT)}`
    );

    expect(exists('dataStreamSize')).toBe(true);
    expect(find('dataStreamSize').text()).toBe(
      `Size${numeral(defaultMetaResponse.indicesRequiringUpgradeDocsSize).format(
        FILE_SIZE_DISPLAY_FORMAT
      )}`
    );

    expect(exists('dataStreamDocumentCount')).toBe(true);
    expect(find('dataStreamDocumentCount').text()).toBe(
      `Document Count${defaultMetaResponse.indicesRequiringUpgradeDocsCount}`
    );

    expect(exists('dataStreamMigrationWarningsCallout')).toBe(true);
    expect(find('dataStreamMigrationWarningsCallout').text()).toContain(
      `Indices created on or before ${moment(
        defaultMetaResponse.lastIndexRequiringUpgradeCreationDate
      ).format(DATE_FORMAT)} need to be reindexed to a compatible format or marked as read-only.`
    );

    expect(exists('dataStreamDetailsText')).toBe(true);
    expect(find('dataStreamDetailsText').text()).toContain(
      `You have ${defaultMetaResponse.indicesRequiringUpgradeCount} backing indices on this data stream that were created in ES 7.x and will not be compatible with next version.`
    );
    expect(find('dataStreamDetailsText').text()).toContain(
      `${defaultMetaResponse.allIndicesCount} total backing indices, and ${defaultMetaResponse.indicesRequiringUpgradeCount} requires upgrade.`
    );
    expect(find('dataStreamDetailsText').text()).toContain(
      `If you do not need to update historical data, mark as read-only. You can reindex post-upgrade if updates are needed.`
    );
    expect(find('dataStreamDetailsText').text()).toContain('Reindex');
    expect(find('dataStreamDetailsText').text()).toContain(
      `If you no longer need this data, you can also proceed by deleting these indices.`
    );

    expect(exists('closeDataStreamReindexingButton')).toBe(true);
    expect(exists('startDataStreamReindexingButton')).toBe(true);
    expect(exists('startDataStreamReadonlyButton')).toBe(true);
  });

  it('renders a callout if user has not the required privileges', async () => {
    httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(MOCK_DS_DEPRECATION.index!, {
      hasRequiredPrivileges: false,
      migrationOp: { status: 0 },
      warnings: [],
    });

    await act(async () => {
      testBed = await setupElasticsearchPage(httpSetup);
    });

    const { actions, exists, component } = testBed;
    component.update();

    await actions.table.clickDeprecationRowAt('dataStream', 0);

    expect(exists('dsInsufficientPrivilegesCallout')).toBe(true);
  });

  it('renders a warning callout if nodes detected with low disk space', async () => {
    httpRequestsMockHelpers.setLoadNodeDiskSpaceResponse([
      {
        nodeId: '9OFkjpAKS_aPzJAuEOSg7w',
        nodeName: 'MacBook-Pro.local',
        available: '25%',
        lowDiskWatermarkSetting: '50%',
      },
    ]);

    const { actions, find } = testBed;

    await actions.table.clickDeprecationRowAt('dataStream', 0);

    expect(find('lowDiskSpaceCallout').text()).toContain('Nodes with low disk space');
    expect(find('impactedNodeListItem').length).toEqual(1);
    expect(find('impactedNodeListItem').at(0).text()).toContain(
      'MacBook-Pro.local (25% available)'
    );
  });

  describe('reindexing', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
        MOCK_DS_DEPRECATION_REINDEX.index!,
        defaultMigrationResponse
      );
      httpRequestsMockHelpers.setDataStreamMetadataResponse(
        MOCK_DS_DEPRECATION_REINDEX.index!,
        defaultMetaResponse
      );

      await act(async () => {
        testBed = await setupElasticsearchPage(httpSetup);
      });

      testBed.component.update();
    });
    it('renders a flyout with data stream details for reindex', async () => {
      const { actions, find, exists } = testBed;

      const dataStreamDeprecation = esDeprecationsMockResponse.migrationsDeprecations[6];

      await actions.table.clickDeprecationRowAt('dataStream', 1);

      expect(exists('reindexDataStreamDetails')).toBe(true);
      expect(find('reindexDataStreamDetails.flyoutTitle').text()).toBe(
        `${dataStreamDeprecation.index}`
      );

      expect(exists('dataStreamDetailsText')).toBe(true);
      expect(find('dataStreamDetailsText').text()).not.toContain(
        `If you do not need to update historical data, mark as read-only. You can reindex post-upgrade if updates are needed.`
      );
      expect(find('dataStreamDetailsText').text()).toContain('Reindex');
      expect(find('dataStreamDetailsText').text()).toContain(
        `If you no longer need this data, you can also proceed by deleting these indices.`
      );

      expect(exists('closeDataStreamReindexingButton')).toBe(true);
      expect(exists('startDataStreamReindexingButton')).toBe(true);
      expect(exists('startDataStreamReadonlyButton')).toBe(false);
    });
    it('renders a flyout with data stream confirm step for reindex', async () => {
      const { actions, find, exists } = testBed;

      await actions.table.clickDeprecationRowAt('dataStream', 1);

      await actions.dataStreamDeprecationFlyout.clickReindexButton(); // details step

      expect(exists('reindexDsWarningCallout')).toBe(true);
      expect(find('reindexDsWarningCallout').text()).toContain(
        `This operation requires destructive changes that cannot be reversed`
      );

      expect(exists('migrationWarningCheckbox')).toBe(true);
      expect(find('migrationWarningCheckbox').length).toBe(1);
      expect(find('migrationWarningCheckbox').text()).toBe(
        'Reindex all incompatible data for this data stream'
      );
      expect(exists('startActionButton')).toBe(true);
      expect(find('startActionButton').text()).toBe('Start reindexing');
      expect(find('startActionButton').props().disabled).toBe(true);
      expect(exists('backButton')).toBe(true);

      await actions.dataStreamDeprecationFlyout.checkMigrationWarningCheckbox();

      expect(find('startActionButton').props().disabled).toBe(false);
    });
    describe('reindexing progress', () => {
      it('reindexing pending', async () => {
        httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
          MOCK_DS_DEPRECATION_REINDEX.index!,
          {
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
          }
        );
        await act(async () => {
          testBed = await setupElasticsearchPage(httpSetup);
        });

        testBed.component.update();
        const { actions, find, exists } = testBed;

        await actions.table.clickDeprecationRowAt('dataStream', 1);

        expect(exists('dataStreamMigrationChecklistFlyout')).toBe(true);
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          'Reindexing in progress…'
        );
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '0 Indices successfully reindexed.'
        );
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '0 Indices currently getting reindexed.'
        );
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '1 Index waiting to start.'
        );
        expect(exists('startDataStreamMigrationButton')).toBe(true);
        expect(find('startDataStreamMigrationButton').props().disabled).toBe(true);
        expect(exists('cancelDataStreamMigrationButton')).toBe(true);
      });
      it('reindexing in progress', async () => {
        httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
          MOCK_DS_DEPRECATION_REINDEX.index!,
          {
            hasRequiredPrivileges: true,
            migrationOp: {
              resolutionType: 'reindex',
              status: DataStreamMigrationStatus.inProgress,
              taskPercComplete: 1,
              progressDetails: {
                startTimeMs: Date.now() - 10000, // now - 10 seconds
                successCount: 0,
                pendingCount: 0,
                inProgressCount: 1,
                errorsCount: 0,
              },
            },
            warnings: [
              {
                warningType: 'incompatibleDataStream',
                resolutionType: 'reindex',
              },
            ],
          }
        );
        await act(async () => {
          testBed = await setupElasticsearchPage(httpSetup);
        });

        testBed.component.update();
        const { actions, find, exists } = testBed;

        await actions.table.clickDeprecationRowAt('dataStream', 1);

        expect(exists('dataStreamMigrationChecklistFlyout')).toBe(true);
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '0 Indices successfully reindexed.'
        );
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '1 Index currently getting reindexed.'
        );
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '0 Indices waiting to start.'
        );

        expect(exists('startDataStreamMigrationButton')).toBe(true);
        expect(find('startDataStreamMigrationButton').props().disabled).toBe(true);
        expect(exists('cancelDataStreamMigrationButton')).toBe(true);
        expect(exists('startDataStreamReadonlyButton')).toBe(false);
      });
      it('reindexing success', async () => {
        httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
          MOCK_DS_DEPRECATION_REINDEX.index!,
          {
            hasRequiredPrivileges: true,
            migrationOp: {
              resolutionType: 'reindex',
              status: DataStreamMigrationStatus.inProgress,
              taskPercComplete: 1,
              progressDetails: {
                startTimeMs: Date.now() - 10000, // now - 10 seconds
                successCount: 1,
                pendingCount: 0,
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
          }
        );
        await act(async () => {
          testBed = await setupElasticsearchPage(httpSetup);
        });

        testBed.component.update();
        const { actions, find, exists } = testBed;

        await actions.table.clickDeprecationRowAt('dataStream', 1);

        expect(exists('dataStreamMigrationChecklistFlyout')).toBe(true);

        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '1 Index successfully reindexed.'
        );
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '0 Indices currently getting reindexed.'
        );
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '0 Indices waiting to start.'
        );

        expect(exists('startDataStreamMigrationButton')).toBe(true);
        expect(find('startDataStreamMigrationButton').props().disabled).toBe(true);
        expect(exists('cancelDataStreamMigrationButton')).toBe(true);
        expect(exists('startDataStreamReadonlyButton')).toBe(false);
      });
      it('reindexing error', async () => {
        httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
          MOCK_DS_DEPRECATION_REINDEX.index!,
          {
            hasRequiredPrivileges: true,
            migrationOp: {
              resolutionType: 'reindex',
              status: DataStreamMigrationStatus.inProgress,
              taskPercComplete: 1,
              progressDetails: {
                startTimeMs: Date.now() - 10000, // now - 10 seconds
                successCount: 0,
                pendingCount: 0,
                inProgressCount: 0,
                errorsCount: 1,
              },
            },
            warnings: [
              {
                warningType: 'incompatibleDataStream',
                resolutionType: 'reindex',
              },
            ],
          }
        );
        await act(async () => {
          testBed = await setupElasticsearchPage(httpSetup);
        });

        testBed.component.update();
        const { actions, find, exists } = testBed;

        await actions.table.clickDeprecationRowAt('dataStream', 1);

        expect(exists('dataStreamMigrationChecklistFlyout')).toBe(true);

        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '1 Index failed to get reindexed.'
        );
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '0 Indices successfully reindexed.'
        );
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '0 Indices currently getting reindexed.'
        );
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '0 Indices waiting to start.'
        );

        expect(exists('startDataStreamMigrationButton')).toBe(true);
        expect(find('startDataStreamMigrationButton').props().disabled).toBe(true);
        expect(exists('cancelDataStreamMigrationButton')).toBe(true);
        expect(exists('startDataStreamReadonlyButton')).toBe(false);
      });
      describe('reindexing failed', () => {
        it('offers read-only if reindexing fails and if read-only is not excluded', async () => {
          httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(MOCK_DS_DEPRECATION.index!, {
            hasRequiredPrivileges: true,
            migrationOp: { resolutionType: 'reindex', status: DataStreamMigrationStatus.failed },
            warnings: [
              {
                warningType: 'incompatibleDataStream',
                resolutionType: 'reindex',
              },
            ],
          });
          const { actions, find, exists } = testBed;

          await actions.table.clickDeprecationRowAt('dataStream', 0);
          await actions.dataStreamDeprecationFlyout.clickReindexButton();

          expect(exists('dataStreamMigrationFailedCallout')).toBe(true);
          expect(find('dataStreamMigrationFailedCallout').text()).toBe('Reindexing error');

          expect(exists('startDataStreamMigrationButton')).toBe(true);
          expect(find('startDataStreamMigrationButton').props().disabled).toBe(false);
          expect(find('startDataStreamMigrationButton').text()).toBe('Try again');

          expect(exists('startDataStreamReadonlyButton')).toBe(true);
          expect(find('startDataStreamReadonlyButton').text()).toBe('Mark as read-only');
        });
        it('does not offers read-only if reindexing fails and read-only is excluded', async () => {
          httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
            MOCK_DS_DEPRECATION_REINDEX.index!,
            {
              hasRequiredPrivileges: true,
              migrationOp: { resolutionType: 'reindex', status: DataStreamMigrationStatus.failed },
              warnings: [
                {
                  warningType: 'incompatibleDataStream',
                  resolutionType: 'reindex',
                },
              ],
            }
          );
          const { actions, find, exists } = testBed;

          await actions.table.clickDeprecationRowAt('dataStream', 1);
          await actions.dataStreamDeprecationFlyout.clickReindexButton();

          expect(exists('dataStreamMigrationFailedCallout')).toBe(true);
          expect(find('dataStreamMigrationFailedCallout').text()).toBe('Reindexing error');

          expect(exists('startDataStreamMigrationButton')).toBe(true);
          expect(find('startDataStreamMigrationButton').props().disabled).toBe(false);
          expect(find('startDataStreamMigrationButton').text()).toBe('Try again');

          expect(exists('startDataStreamReadonlyButton')).toBe(false);
        });
      });
    });
  });
  describe('read-only', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
        MOCK_DS_DEPRECATION_READ_ONLY.index!,
        defaultMigrationResponse
      );
      httpRequestsMockHelpers.setDataStreamMetadataResponse(
        MOCK_DS_DEPRECATION_READ_ONLY.index!,
        defaultMetaResponse
      );

      await act(async () => {
        testBed = await setupElasticsearchPage(httpSetup);
      });

      testBed.component.update();
    });
    it('renders a flyout with data stream details for read-only', async () => {
      const { actions, find, exists } = testBed;

      const dataStreamDeprecation = esDeprecationsMockResponse.migrationsDeprecations[7];

      await actions.table.clickDeprecationRowAt('dataStream', 2);

      expect(exists('reindexDataStreamDetails')).toBe(true);
      expect(find('reindexDataStreamDetails.flyoutTitle').text()).toBe(
        `${dataStreamDeprecation.index}`
      );

      expect(exists('dataStreamDetailsText')).toBe(true);
      expect(find('dataStreamDetailsText').text()).toContain(
        `If you do not need to update historical data, mark as read-only. You can reindex post-upgrade if updates are needed.`
      );
      expect(find('dataStreamDetailsText').text()).not.toContain('Reindex');

      expect(exists('closeDataStreamReindexingButton')).toBe(true);
      expect(exists('startDataStreamReindexingButton')).toBe(false);
      expect(exists('startDataStreamReadonlyButton')).toBe(true);
    });
    it('renders a flyout with data stream confirm step for read-only', async () => {
      const { actions, find, exists } = testBed;

      await actions.table.clickDeprecationRowAt('dataStream', 2);

      await actions.dataStreamDeprecationFlyout.clickReadOnlyButton(); // details step

      expect(exists('readOnlyDsWarningCallout')).toBe(true);
      expect(find('readOnlyDsWarningCallout').text()).toContain(
        'Marking this data read-only could affect some of the existing setups'
      );

      expect(exists('migrationWarningCheckbox')).toBe(true);
      expect(find('migrationWarningCheckbox').length).toBe(1);
      expect(find('migrationWarningCheckbox').text()).toBe(
        'Reindex all incompatible data for this data stream'
      );
      expect(exists('startActionButton')).toBe(true);
      expect(find('startActionButton').text()).toBe('Mark all read-only');
      expect(find('startActionButton').props().disabled).toBe(true);
      expect(exists('backButton')).toBe(true);

      await actions.dataStreamDeprecationFlyout.checkMigrationWarningCheckbox();

      expect(find('startActionButton').props().disabled).toBe(false);
    });
    describe('read-only progress', () => {
      it('pending', async () => {
        httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
          MOCK_DS_DEPRECATION_READ_ONLY.index!,
          {
            hasRequiredPrivileges: true,
            migrationOp: {
              resolutionType: 'readonly',
              status: DataStreamMigrationStatus.inProgress,
              taskPercComplete: 1,
              progressDetails: {
                startTimeMs: Date.now() - 10000,
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
          }
        );
        await act(async () => {
          testBed = await setupElasticsearchPage(httpSetup);
        });

        testBed.component.update();
        const { actions, find, exists } = testBed;

        await actions.table.clickDeprecationRowAt('dataStream', 2);

        expect(exists('dataStreamMigrationChecklistFlyout')).toBe(true);
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          'Marking as read-only in progress…'
        );
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '0 Indices successfully marked as read-only.'
        );
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '0 Indices currently getting marked as read-only.'
        );
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '1 Index waiting to start.'
        );
        expect(exists('startDataStreamMigrationButton')).toBe(true);
        expect(find('startDataStreamMigrationButton').props().disabled).toBe(true);
        expect(exists('cancelDataStreamMigrationButton')).toBe(true);
      });
      it('read-only in progress', async () => {
        httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
          MOCK_DS_DEPRECATION_READ_ONLY.index!,
          {
            hasRequiredPrivileges: true,
            migrationOp: {
              resolutionType: 'readonly',
              status: DataStreamMigrationStatus.inProgress,
              taskPercComplete: 1,
              progressDetails: {
                startTimeMs: Date.now() - 10000, // now - 10 seconds
                successCount: 0,
                pendingCount: 0,
                inProgressCount: 1,
                errorsCount: 0,
              },
            },
            warnings: [
              {
                warningType: 'incompatibleDataStream',
                resolutionType: 'readonly',
              },
            ],
          }
        );
        await act(async () => {
          testBed = await setupElasticsearchPage(httpSetup);
        });

        testBed.component.update();
        const { actions, find, exists } = testBed;

        await actions.table.clickDeprecationRowAt('dataStream', 2);

        expect(exists('dataStreamMigrationChecklistFlyout')).toBe(true);
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '0 Indices successfully marked as read-only.'
        );
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '1 Index currently getting marked as read-only.'
        );
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '0 Indices waiting to start.'
        );

        expect(exists('startDataStreamMigrationButton')).toBe(true);
        expect(find('startDataStreamMigrationButton').props().disabled).toBe(true);
        expect(exists('cancelDataStreamMigrationButton')).toBe(true);
      });
      it('read-only success', async () => {
        httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
          MOCK_DS_DEPRECATION_READ_ONLY.index!,
          {
            hasRequiredPrivileges: true,
            migrationOp: {
              resolutionType: 'readonly',
              status: DataStreamMigrationStatus.inProgress,
              taskPercComplete: 1,
              progressDetails: {
                startTimeMs: Date.now() - 10000, // now - 10 seconds
                successCount: 1,
                pendingCount: 0,
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
          }
        );
        await act(async () => {
          testBed = await setupElasticsearchPage(httpSetup);
        });

        testBed.component.update();
        const { actions, find, exists } = testBed;

        await actions.table.clickDeprecationRowAt('dataStream', 2);

        expect(exists('dataStreamMigrationChecklistFlyout')).toBe(true);
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '1 Index successfully marked as read-only.'
        );
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '0 Indices currently getting marked as read-only.'
        );
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '0 Indices waiting to start.'
        );

        expect(exists('startDataStreamMigrationButton')).toBe(true);
        expect(find('startDataStreamMigrationButton').props().disabled).toBe(true);
        expect(exists('cancelDataStreamMigrationButton')).toBe(true);
      });
      it('reindexing error', async () => {
        httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
          MOCK_DS_DEPRECATION_READ_ONLY.index!,
          {
            hasRequiredPrivileges: true,
            migrationOp: {
              resolutionType: 'readonly',
              status: DataStreamMigrationStatus.inProgress,
              taskPercComplete: 1,
              progressDetails: {
                startTimeMs: Date.now() - 10000,
                successCount: 0,
                pendingCount: 0,
                inProgressCount: 0,
                errorsCount: 1,
              },
            },
            warnings: [
              {
                warningType: 'incompatibleDataStream',
                resolutionType: 'readonly',
              },
            ],
          }
        );
        await act(async () => {
          testBed = await setupElasticsearchPage(httpSetup);
        });

        testBed.component.update();
        const { actions, find, exists } = testBed;

        await actions.table.clickDeprecationRowAt('dataStream', 2);

        expect(exists('dataStreamMigrationChecklistFlyout')).toBe(true);

        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '1 Index failed to get marked as read-only.'
        );
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '0 Indices successfully marked as read-only.'
        );
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '0 Indices currently getting marked as read-only.'
        );
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          '0 Indices waiting to start.'
        );

        expect(exists('startDataStreamMigrationButton')).toBe(true);
        expect(find('startDataStreamMigrationButton').props().disabled).toBe(true);
        expect(exists('cancelDataStreamMigrationButton')).toBe(true);
      });
    });
  });

  it('renders a callout if fetch fails', async () => {
    httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(MOCK_DS_DEPRECATION.index!, {
      hasRequiredPrivileges: true,
      migrationOp: { resolutionType: 'reindex', status: DataStreamMigrationStatus.fetchFailed },
      warnings: [],
    });

    const { actions, exists, find } = testBed;

    await actions.table.clickDeprecationRowAt('dataStream', 0);
    await actions.dataStreamDeprecationFlyout.clickReindexButton();

    expect(exists('fetchFailedCallout')).toBe(true);
    expect(find('fetchFailedCallout').text()).toBe('Migration status not available');
  });
});
