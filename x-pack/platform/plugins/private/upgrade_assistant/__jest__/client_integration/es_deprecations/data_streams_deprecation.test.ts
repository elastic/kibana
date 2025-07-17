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

describe('Data streams deprecation', () => {
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

  describe('reindexing flyout', () => {
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

      await actions.table.clickDeprecationRowAt({
        deprecationType: 'dataStream',
        index: 0,
        action: 'reindex',
      });

      expect(find('lowDiskSpaceCallout').text()).toContain('Nodes with low disk space');
      expect(find('impactedNodeListItem').length).toEqual(1);
      expect(find('impactedNodeListItem').at(0).text()).toContain(
        'MacBook-Pro.local (25% available)'
      );
    });

    it('renders a flyout with data stream confirm step for reindex', async () => {
      const dataStreamDeprecation = esDeprecationsMockResponse.migrationsDeprecations[6];
      const { actions, find, exists } = testBed;

      await actions.table.clickDeprecationRowAt({
        deprecationType: 'dataStream',
        index: 1,
        action: 'reindex',
      });

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
        ).format(DATE_FORMAT)} need to be reindexed to a compatible format or set to read-only.`
      );

      expect(exists('reindexDsWarningCallout')).toBe(true);
      expect(find('reindexDsWarningCallout').text()).toContain(
        `This operation requires destructive changes that cannot be reversed`
      );

      expect(exists('migrationWarningCheckbox')).toBe(true);
      expect(find('migrationWarningCheckbox').length).toBe(1);
      expect(find('migrationWarningCheckbox').text()).toContain(
        'Reindex all incompatible data for this data stream'
      );
      expect(exists('startActionButton')).toBe(true);
      expect(find('startActionButton').text()).toBe('Start reindexing');
      expect(find('startActionButton').props().disabled).toBe(true);
      expect(exists('closeDataStreamConfirmStepButton')).toBe(true);

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

        await actions.table.clickDeprecationRowAt({
          deprecationType: 'dataStream',
          index: 1,
          action: 'reindex',
        });

        expect(exists('dataStreamMigrationChecklistFlyout')).toBe(true);
        expect(find('dataStreamMigrationChecklistFlyout').text()).toContain(
          `Reindexing ${MOCK_DS_DEPRECATION_REINDEX.index} in progress…`
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

        await actions.table.clickDeprecationRowAt({
          deprecationType: 'dataStream',
          index: 1,
          action: 'reindex',
        });

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

        await actions.table.clickDeprecationRowAt({
          deprecationType: 'dataStream',
          index: 1,
          action: 'reindex',
        });

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

        await actions.table.clickDeprecationRowAt({
          deprecationType: 'dataStream',
          index: 1,
          action: 'reindex',
        });

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
    });
  });
  describe('read-only modal', () => {
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

      await actions.table.clickDeprecationRowAt({
        deprecationType: 'dataStream',
        index: 0,
        action: 'reindex',
      });

      expect(find('lowDiskSpaceCallout').text()).toContain('Nodes with low disk space');
      expect(find('impactedNodeListItem').length).toEqual(1);
      expect(find('impactedNodeListItem').at(0).text()).toContain(
        'MacBook-Pro.local (25% available)'
      );
    });

    it('renders a modal with data stream confirm step for read-only', async () => {
      const { actions, find, exists } = testBed;

      await actions.table.clickDeprecationRowAt({
        deprecationType: 'dataStream',
        index: 1,
        action: 'readonly',
      });

      expect(exists('readOnlyDsWarningCallout')).toBe(true);
      expect(find('readOnlyDsWarningCallout').text()).toContain(
        'Setting this data to read-only could affect some of the existing setups'
      );

      expect(exists('migrationWarningCheckbox')).toBe(true);
      expect(find('migrationWarningCheckbox').length).toBe(1);
      expect(find('migrationWarningCheckbox').text()).toContain(
        'Reindex all incompatible data for this data stream'
      );
      expect(exists('startActionButton')).toBe(true);
      expect(find('startActionButton').text()).toBe('Set all to read-only');
      expect(find('startActionButton').props().disabled).toBe(true);
      expect(exists('cancelDataStreamMigrationModal')).toBe(true);

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

        await actions.table.clickDeprecationRowAt({
          deprecationType: 'dataStream',
          index: 1,
          action: 'readonly',
        });

        expect(exists('dataStreamMigrationChecklistModal')).toBe(true);
        expect(find('dataStreamMigrationChecklistModal').text()).toContain(
          `Setting to read-only ${MOCK_DS_DEPRECATION_READ_ONLY.index} in progress…`
        );
        expect(find('dataStreamMigrationChecklistModal').text()).toContain(
          '0 Indices successfully set to read-only.'
        );
        expect(find('dataStreamMigrationChecklistModal').text()).toContain(
          '0 Indices currently getting set to read-only.'
        );
        expect(find('dataStreamMigrationChecklistModal').text()).toContain(
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

        await actions.table.clickDeprecationRowAt({
          deprecationType: 'dataStream',
          index: 1,
          action: 'readonly',
        });

        expect(exists('dataStreamMigrationChecklistModal')).toBe(true);
        expect(find('dataStreamMigrationChecklistModal').text()).toContain(
          '0 Indices successfully set to read-only.'
        );
        expect(find('dataStreamMigrationChecklistModal').text()).toContain(
          '1 Index currently getting set to read-only.'
        );
        expect(find('dataStreamMigrationChecklistModal').text()).toContain(
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

        await actions.table.clickDeprecationRowAt({
          deprecationType: 'dataStream',
          index: 1,
          action: 'readonly',
        });

        expect(exists('dataStreamMigrationChecklistModal')).toBe(true);
        expect(find('dataStreamMigrationChecklistModal').text()).toContain(
          '1 Index successfully set to read-only.'
        );
        expect(find('dataStreamMigrationChecklistModal').text()).toContain(
          '0 Indices currently getting set to read-only.'
        );
        expect(find('dataStreamMigrationChecklistModal').text()).toContain(
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

        await actions.table.clickDeprecationRowAt({
          deprecationType: 'dataStream',
          index: 1,
          action: 'readonly',
        });

        expect(exists('dataStreamMigrationChecklistModal')).toBe(true);

        expect(find('dataStreamMigrationChecklistModal').text()).toContain(
          '1 Index failed to get set to read-only.'
        );
        expect(find('dataStreamMigrationChecklistModal').text()).toContain(
          '0 Indices successfully set to read-only.'
        );
        expect(find('dataStreamMigrationChecklistModal').text()).toContain(
          '0 Indices currently getting set to read-only.'
        );
        expect(find('dataStreamMigrationChecklistModal').text()).toContain(
          '0 Indices waiting to start.'
        );

        expect(exists('startDataStreamMigrationButton')).toBe(true);
        expect(find('startDataStreamMigrationButton').props().disabled).toBe(true);
        expect(exists('cancelDataStreamMigrationButton')).toBe(true);
      });
    });
  });
  describe('delete modal', () => {
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

    it('renders a modal with data stream confirm step for delete', async () => {
      const { actions, find, exists } = testBed;

      await actions.table.clickDeprecationRowAt({
        deprecationType: 'dataStream',
        index: 1,
        action: 'delete',
      });

      expect(exists('updateDataStreamModal')).toBe(true);
      expect(find('dataStreamModalTitle').text()).toContain('Delete data stream');

      expect(exists('startDeleteButton')).toBe(true);
      expect(find('startDeleteButton').props().disabled).toBe(true);
      await actions.reindexDeprecationFlyout.fillDeleteInputText('bad input');
      expect(find('startDeleteButton').props().disabled).toBe(true);
      await actions.reindexDeprecationFlyout.fillDeleteInputText('delete');

      expect(find('startDeleteButton').props().disabled).toBe(false);
    });
    describe('read-only progress', () => {
      it('pending', async () => {
        httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
          MOCK_DS_DEPRECATION_READ_ONLY.index!,
          {
            hasRequiredPrivileges: true,
            migrationOp: {
              resolutionType: 'delete',
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

        await actions.table.clickDeprecationRowAt({
          deprecationType: 'dataStream',
          index: 1,
          action: 'delete',
        });

        expect(find('dataStreamModalTitle').text()).toContain('Deleting data stream');
        expect(exists('dataStreamMigrationChecklistModal')).toBe(true);
        expect(find('dataStreamMigrationChecklistModal').text()).toContain(
          `Deleting ${MOCK_DS_DEPRECATION_READ_ONLY.index} in progress…`
        );
        expect(exists('startDataStreamMigrationButton')).toBe(true);
        expect(find('startDataStreamMigrationButton').props().disabled).toBe(true);
        expect(exists('cancelDataStreamMigrationButton')).toBe(false);
      });
      it('deleting in progress', async () => {
        httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
          MOCK_DS_DEPRECATION_READ_ONLY.index!,
          {
            hasRequiredPrivileges: true,
            migrationOp: {
              resolutionType: 'delete',
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

        await actions.table.clickDeprecationRowAt({
          deprecationType: 'dataStream',
          index: 1,
          action: 'delete',
        });

        expect(find('dataStreamModalTitle').text()).toContain('Deleting data stream');
        expect(exists('dataStreamMigrationChecklistModal')).toBe(true);
        expect(find('dataStreamMigrationChecklistModal').text()).toContain(
          `Deleting ${MOCK_DS_DEPRECATION_READ_ONLY.index} in progress…`
        );
        expect(exists('startDataStreamMigrationButton')).toBe(true);
        expect(find('startDataStreamMigrationButton').props().disabled).toBe(true);
      });
      it('delete success', async () => {
        httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
          MOCK_DS_DEPRECATION_READ_ONLY.index!,
          {
            hasRequiredPrivileges: true,
            migrationOp: {
              resolutionType: 'delete',
              status: DataStreamMigrationStatus.completed,
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

        await actions.table.clickDeprecationRowAt({
          deprecationType: 'dataStream',
          index: 1,
          action: 'delete',
        });
        await act(async () => {
          jest.advanceTimersByTime(1500); // advance time to simulate completion
        });
        testBed.component.update();

        expect(exists('updateDataStreamModal')).toBe(true);
        expect(find('dataStreamModalTitle').text()).toContain('Deleting data stream completed');
        expect(exists('dataStreamMigrationCompletedDescription')).toBe(true);
        expect(find('dataStreamMigrationCompletedDescription').text()).toContain(
          `Success! Data stream ${MOCK_DS_DEPRECATION_READ_ONLY.index} successfully deleted.`
        );
      });
    });
  });
});
