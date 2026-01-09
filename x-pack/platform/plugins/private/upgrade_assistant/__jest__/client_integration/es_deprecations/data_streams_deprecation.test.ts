/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import numeral from '@elastic/numeral';
import '@testing-library/jest-dom';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';

import { setupEnvironment } from '../helpers/setup_environment';
import { setupElasticsearchPage } from './es_deprecations.helpers';
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

const getMetaResponseForDataStream = (dataStreamName: string, documentationUrl: string) => ({
  ...defaultMetaResponse,
  dataStreamName,
  documentationUrl,
});

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
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;

    httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esDeprecationsMockResponse);
    httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
      MOCK_DS_DEPRECATION.index!,
      defaultMigrationResponse
    );
    httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
      MOCK_DS_DEPRECATION_REINDEX.index!,
      defaultMigrationResponse
    );
    httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
      MOCK_DS_DEPRECATION_READ_ONLY.index!,
      defaultMigrationResponse
    );

    httpRequestsMockHelpers.setDataStreamMetadataResponse(
      MOCK_DS_DEPRECATION.index!,
      getMetaResponseForDataStream(MOCK_DS_DEPRECATION.index!, MOCK_DS_DEPRECATION.url)
    );
    httpRequestsMockHelpers.setDataStreamMetadataResponse(
      MOCK_DS_DEPRECATION_REINDEX.index!,
      getMetaResponseForDataStream(
        MOCK_DS_DEPRECATION_REINDEX.index!,
        MOCK_DS_DEPRECATION_REINDEX.url
      )
    );
    httpRequestsMockHelpers.setDataStreamMetadataResponse(
      MOCK_DS_DEPRECATION_READ_ONLY.index!,
      getMetaResponseForDataStream(
        MOCK_DS_DEPRECATION_READ_ONLY.index!,
        MOCK_DS_DEPRECATION_READ_ONLY.url
      )
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

    httpRequestsMockHelpers.setLoadNodeDiskSpaceResponse([]);
  });

  const setupPage = async () => {
    await setupElasticsearchPage(httpSetup);
  };

  const openReindexFlyoutAt = async (index: number) => {
    fireEvent.click(screen.getAllByTestId('deprecation-dataStream-reindex')[index]);
    await waitFor(() => {
      const flyout =
        screen.queryByTestId('reindexDataStreamDetails') ??
        screen.queryByTestId('dataStreamMigrationChecklistFlyout');

      expect(flyout).not.toBeNull();
    });

    return (screen.queryByTestId('reindexDataStreamDetails') ??
      screen.queryByTestId('dataStreamMigrationChecklistFlyout'))!;
  };

  const openReadOnlyModalAt = async (index: number) => {
    fireEvent.click(screen.getAllByTestId('deprecation-dataStream-readonly')[index]);
    await waitFor(() => {
      const modal =
        screen.queryByTestId('updateIndexModal') ??
        screen.queryByTestId('dataStreamMigrationChecklistModal');

      expect(modal).not.toBeNull();
    });

    return (screen.queryByTestId('updateIndexModal') ??
      screen.queryByTestId('dataStreamMigrationChecklistModal'))!;
  };

  const checkMigrationWarningCheckbox = async () => {
    const checkbox = screen.getByTestId('migrationWarningCheckbox');
    fireEvent.click(within(checkbox).getByRole('checkbox'));

    await waitFor(() => {
      expect(screen.getByTestId('startActionButton')).toBeEnabled();
    });
  };

  describe('reindexing flyout', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
        MOCK_DS_DEPRECATION_REINDEX.index!,
        defaultMigrationResponse
      );
      httpRequestsMockHelpers.setDataStreamMetadataResponse(
        MOCK_DS_DEPRECATION_REINDEX.index!,
        getMetaResponseForDataStream(
          MOCK_DS_DEPRECATION_REINDEX.index!,
          MOCK_DS_DEPRECATION_REINDEX.url
        )
      );
    });
    it('renders a warning callout if nodes detected with low disk space', async () => {
      httpRequestsMockHelpers.setLoadNodeDiskSpaceResponse([
        {
          nodeId: '9OFkjpAKS_aPzJAuEOSg7w',
          nodeName: 'MacBook-Pro.local',
          available: '25%',
        },
      ]);

      await setupPage();
      const flyout = await openReindexFlyoutAt(0);

      await within(flyout).findByTestId('dataStreamLastIndexCreationDate');

      expect(within(flyout).getByTestId('lowDiskSpaceCallout')).toHaveTextContent(
        'Nodes with low disk space'
      );
      expect(within(flyout).getAllByTestId('impactedNodeListItem')).toHaveLength(1);
      expect(within(flyout).getAllByTestId('impactedNodeListItem')[0]).toHaveTextContent(
        'MacBook-Pro.local (25% available)'
      );
    });

    it('renders a flyout with data stream confirm step for reindex', async () => {
      const dataStreamDeprecation = esDeprecationsMockResponse.migrationsDeprecations[6];
      await setupPage();
      const flyout = await openReindexFlyoutAt(1);

      expect(within(flyout).getByTestId('flyoutTitle')).toHaveTextContent(
        `${dataStreamDeprecation.index}`
      );

      expect(await screen.findByTestId('dataStreamLastIndexCreationDate')).toHaveTextContent(
        `Migration required for indices created on or before${moment(
          defaultMetaResponse.lastIndexRequiringUpgradeCreationDate
        ).format(DATE_FORMAT)}`
      );

      expect(screen.getByTestId('dataStreamSize')).toHaveTextContent(
        `Size${numeral(defaultMetaResponse.indicesRequiringUpgradeDocsSize).format(
          FILE_SIZE_DISPLAY_FORMAT
        )}`
      );

      expect(screen.getByTestId('dataStreamDocumentCount')).toHaveTextContent(
        `Document Count${defaultMetaResponse.indicesRequiringUpgradeDocsCount}`
      );

      expect(screen.getByTestId('dataStreamMigrationWarningsCallout')).toHaveTextContent(
        `Indices created on or before ${moment(
          defaultMetaResponse.lastIndexRequiringUpgradeCreationDate
        ).format(DATE_FORMAT)} need to be reindexed to a compatible format or set to read-only.`
      );

      expect(screen.getByTestId('reindexDsWarningCallout')).toHaveTextContent(
        `This operation requires destructive changes that cannot be reversed`
      );

      expect(screen.getByTestId('migrationWarningCheckbox')).toHaveTextContent(
        'Reindex all incompatible data for this data stream'
      );
      expect(screen.getByTestId('startActionButton')).toHaveTextContent('Start reindexing');
      expect(screen.getByTestId('startActionButton')).toBeDisabled();
      expect(screen.getByTestId('closeDataStreamConfirmStepButton')).toBeInTheDocument();

      await checkMigrationWarningCheckbox();

      expect(screen.getByTestId('startActionButton')).toBeEnabled();
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
        await setupPage();
        const flyout = await openReindexFlyoutAt(1);

        const checklist = await within(flyout).findByTestId('dataStreamMigrationChecklistFlyout');
        expect(checklist).toHaveTextContent(
          `Reindexing ${MOCK_DS_DEPRECATION_REINDEX.index} in progress…`
        );
        expect(checklist).toHaveTextContent('0 Indices successfully reindexed.');
        expect(checklist).toHaveTextContent('0 Indices currently getting reindexed.');
        expect(checklist).toHaveTextContent('1 Index waiting to start.');
        expect(screen.getByTestId('startDataStreamMigrationButton')).toBeDisabled();
        expect(screen.getByTestId('cancelDataStreamMigrationButton')).toBeInTheDocument();
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
        await setupPage();
        const flyout = await openReindexFlyoutAt(1);

        const checklist = await within(flyout).findByTestId('dataStreamMigrationChecklistFlyout');
        expect(checklist).toHaveTextContent('0 Indices successfully reindexed.');
        expect(checklist).toHaveTextContent('1 Index currently getting reindexed.');
        expect(checklist).toHaveTextContent('0 Indices waiting to start.');

        expect(screen.getByTestId('startDataStreamMigrationButton')).toBeDisabled();
        expect(screen.getByTestId('cancelDataStreamMigrationButton')).toBeInTheDocument();
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
        await setupPage();
        const flyout = await openReindexFlyoutAt(1);

        const checklist = await within(flyout).findByTestId('dataStreamMigrationChecklistFlyout');
        expect(checklist).toHaveTextContent('1 Index successfully reindexed.');
        expect(checklist).toHaveTextContent('0 Indices currently getting reindexed.');
        expect(checklist).toHaveTextContent('0 Indices waiting to start.');

        expect(screen.getByTestId('startDataStreamMigrationButton')).toBeDisabled();
        expect(screen.getByTestId('cancelDataStreamMigrationButton')).toBeInTheDocument();
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
        await setupPage();
        const flyout = await openReindexFlyoutAt(1);

        const checklist = await within(flyout).findByTestId('dataStreamMigrationChecklistFlyout');
        expect(checklist).toHaveTextContent('1 Index failed to get reindexed.');
        expect(checklist).toHaveTextContent('0 Indices successfully reindexed.');
        expect(checklist).toHaveTextContent('0 Indices currently getting reindexed.');
        expect(checklist).toHaveTextContent('0 Indices waiting to start.');

        expect(screen.getByTestId('startDataStreamMigrationButton')).toBeDisabled();
        expect(screen.getByTestId('cancelDataStreamMigrationButton')).toBeInTheDocument();
      });
    });
  });
  describe('read-only modal', () => {
    beforeEach(() => {
      httpRequestsMockHelpers.setDataStreamMigrationStatusResponse(
        MOCK_DS_DEPRECATION_READ_ONLY.index!,
        defaultMigrationResponse
      );
      httpRequestsMockHelpers.setDataStreamMetadataResponse(
        MOCK_DS_DEPRECATION_READ_ONLY.index!,
        getMetaResponseForDataStream(
          MOCK_DS_DEPRECATION_READ_ONLY.index!,
          MOCK_DS_DEPRECATION_READ_ONLY.url
        )
      );
    });

    it('renders a warning callout if nodes detected with low disk space', async () => {
      httpRequestsMockHelpers.setLoadNodeDiskSpaceResponse([
        {
          nodeId: '9OFkjpAKS_aPzJAuEOSg7w',
          nodeName: 'MacBook-Pro.local',
          available: '25%',
        },
      ]);

      await setupPage();
      const modal = await openReadOnlyModalAt(1);

      await within(modal).findByTestId('readonlyDataStreamModalTitle');

      expect(within(modal).getByTestId('lowDiskSpaceCallout')).toHaveTextContent(
        'Nodes with low disk space'
      );
      expect(within(modal).getAllByTestId('impactedNodeListItem')).toHaveLength(1);
      expect(within(modal).getAllByTestId('impactedNodeListItem')[0]).toHaveTextContent(
        'MacBook-Pro.local (25% available)'
      );
    });

    it('renders a modal with data stream confirm step for read-only', async () => {
      await setupPage();
      const modal = await openReadOnlyModalAt(1);

      expect(await within(modal).findByTestId('readOnlyDsWarningCallout')).toHaveTextContent(
        'Setting this data to read-only could affect some of the existing setups'
      );

      expect(screen.getByTestId('migrationWarningCheckbox')).toHaveTextContent(
        'Reindex all incompatible data for this data stream'
      );
      expect(screen.getByTestId('startActionButton')).toHaveTextContent('Set all to read-only');
      expect(screen.getByTestId('startActionButton')).toBeDisabled();
      expect(within(modal).getByTestId('cancelDataStreamMigrationModal')).toBeInTheDocument();

      await checkMigrationWarningCheckbox();

      expect(screen.getByTestId('startActionButton')).toBeEnabled();
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
        await setupPage();
        await openReadOnlyModalAt(1);

        const checklist = screen.getByTestId('dataStreamMigrationChecklistModal');
        expect(checklist).toHaveTextContent(
          `Setting to read-only ${MOCK_DS_DEPRECATION_READ_ONLY.index} in progress…`
        );
        expect(checklist).toHaveTextContent('0 Indices successfully set to read-only.');
        expect(checklist).toHaveTextContent('0 Indices currently getting set to read-only.');
        expect(checklist).toHaveTextContent('1 Index waiting to start.');

        expect(screen.getByTestId('startDataStreamMigrationButton')).toBeDisabled();
        expect(screen.getByTestId('cancelDataStreamMigrationButton')).toBeInTheDocument();
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
        await setupPage();
        await openReadOnlyModalAt(1);

        const checklist = screen.getByTestId('dataStreamMigrationChecklistModal');
        expect(checklist).toHaveTextContent('0 Indices successfully set to read-only.');
        expect(checklist).toHaveTextContent('1 Index currently getting set to read-only.');
        expect(checklist).toHaveTextContent('0 Indices waiting to start.');

        expect(screen.getByTestId('startDataStreamMigrationButton')).toBeDisabled();
        expect(screen.getByTestId('cancelDataStreamMigrationButton')).toBeInTheDocument();
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
        await setupPage();
        await openReadOnlyModalAt(1);

        const checklist = screen.getByTestId('dataStreamMigrationChecklistModal');
        expect(checklist).toHaveTextContent('1 Index successfully set to read-only.');
        expect(checklist).toHaveTextContent('0 Indices currently getting set to read-only.');
        expect(checklist).toHaveTextContent('0 Indices waiting to start.');

        expect(screen.getByTestId('startDataStreamMigrationButton')).toBeDisabled();
        expect(screen.getByTestId('cancelDataStreamMigrationButton')).toBeInTheDocument();
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
        await setupPage();
        await openReadOnlyModalAt(1);

        const checklist = screen.getByTestId('dataStreamMigrationChecklistModal');

        expect(checklist).toHaveTextContent('1 Index failed to get set to read-only.');
        expect(checklist).toHaveTextContent('0 Indices successfully set to read-only.');
        expect(checklist).toHaveTextContent('0 Indices currently getting set to read-only.');
        expect(checklist).toHaveTextContent('0 Indices waiting to start.');

        expect(screen.getByTestId('startDataStreamMigrationButton')).toBeDisabled();
        expect(screen.getByTestId('cancelDataStreamMigrationButton')).toBeInTheDocument();
      });
    });
  });
});
