/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';

import type { ReindexStatusResponse } from '@kbn/reindex-service-plugin/common';
import { ReindexStep } from '@kbn/reindex-service-plugin/common';
import { ReindexStatus } from '@kbn/upgrade-assistant-pkg-common';
import { setupEnvironment } from '../helpers/setup_environment';
import { setupElasticsearchPage } from './es_deprecations.helpers';
import {
  esDeprecationsMockResponse,
  MOCK_SNAPSHOT_ID,
  MOCK_JOB_ID,
  MOCK_REINDEX_DEPRECATION,
} from './mocked_responses';

const defaultReindexStatusMeta: ReindexStatusResponse['meta'] = {
  indexName: 'foo',
  aliases: [],
  isFrozen: false,
  isReadonly: false,
  isInDataStream: false,
  isFollowerIndex: false,
};

describe('Reindex deprecation flyout', () => {
  afterEach(async () => {
    const flyout = screen.queryByTestId('reindexDetails');
    if (flyout) {
      const closeButton = within(flyout).getByRole('button', { name: 'Close' });
      fireEvent.click(closeButton);
      await waitFor(() => {
        expect(screen.queryByTestId('reindexDetails')).toBeNull();
      });
    }
  });

  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  const openReindexFlyout = async () => {
    fireEvent.click(screen.getAllByTestId('deprecation-reindex-reindex')[0]);
    return await screen.findByTestId('reindexDetails');
  };

  const proceedToReindexProgress = async () => {
    fireEvent.click(screen.getByTestId('startReindexingButton'));

    const warningCheckbox = screen.queryByTestId('warninStepCheckbox');
    if (warningCheckbox) {
      fireEvent.click(within(warningCheckbox).getByRole('checkbox'));

      await waitFor(() => {
        expect(screen.getByTestId('startReindexingButton')).toBeEnabled();
      });

      fireEvent.click(screen.getByTestId('startReindexingButton'));
    }
  };

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

    await setupElasticsearchPage(httpSetup);
  });

  it('renders error callout when reindex fails', async () => {
    httpRequestsMockHelpers.setStartReindexingResponse(MOCK_REINDEX_DEPRECATION.index!, undefined, {
      statusCode: 404,
      message: 'no such index [test]',
    });

    const flyout = await openReindexFlyout();
    await proceedToReindexProgress();

    expect(flyout).toBeInTheDocument();
    expect(await within(flyout).findByTestId('reindexingFailedCallout')).toBeInTheDocument();
  });

  it('renders error callout when fetch status fails', async () => {
    httpRequestsMockHelpers.setReindexStatusResponse(MOCK_REINDEX_DEPRECATION.index!, undefined, {
      statusCode: 404,
      message: 'no such index [test]',
    });

    const flyout = await openReindexFlyout();
    await proceedToReindexProgress();

    expect(flyout).toBeInTheDocument();
    expect(await within(flyout).findByTestId('fetchFailedCallout')).toBeInTheDocument();
  });

  describe('reindexing progress', () => {
    it('renders a flyout with index confirm step for reindex', async () => {
      const reindexDeprecation = esDeprecationsMockResponse.migrationsDeprecations[3];
      const flyout = await openReindexFlyout();

      expect(flyout).toBeInTheDocument();
      expect(within(flyout).getByTestId('flyoutTitle')).toHaveTextContent(
        `Reindex ${reindexDeprecation.index}`
      );
    });
    it('has started but not yet reindexing documents', async () => {
      httpRequestsMockHelpers.setReindexStatusResponse(MOCK_REINDEX_DEPRECATION.index!, {
        reindexOp: {
          status: ReindexStatus.inProgress,
          lastCompletedStep: ReindexStep.readonly,
          reindexTaskPercComplete: null,
        },
        warnings: [],
        hasRequiredPrivileges: true,
        meta: defaultReindexStatusMeta,
      });

      await openReindexFlyout();
      await proceedToReindexProgress();

      await waitFor(() => {
        expect(screen.getByTestId('reindexChecklistTitle')).toHaveTextContent(
          'Reindexing in progress… 5%'
        );
      });
      expect(screen.queryByTestId('cancelReindexingDocumentsButton')).toBeNull();
    });

    it('has started reindexing documents', async () => {
      httpRequestsMockHelpers.setReindexStatusResponse(MOCK_REINDEX_DEPRECATION.index!, {
        reindexOp: {
          status: ReindexStatus.inProgress,
          lastCompletedStep: ReindexStep.reindexStarted,
          reindexTaskPercComplete: 0.25,
        },
        warnings: [],
        hasRequiredPrivileges: true,
        meta: defaultReindexStatusMeta,
      });

      await openReindexFlyout();
      await proceedToReindexProgress();

      await waitFor(() => {
        expect(screen.getByTestId('reindexChecklistTitle')).toHaveTextContent(
          'Reindexing in progress… 30%'
        );
      });
      expect(await screen.findByTestId('cancelReindexingDocumentsButton')).toBeInTheDocument();
    });

    it('has completed reindexing documents', async () => {
      httpRequestsMockHelpers.setReindexStatusResponse(MOCK_REINDEX_DEPRECATION.index!, {
        reindexOp: {
          status: ReindexStatus.inProgress,
          lastCompletedStep: ReindexStep.reindexCompleted,
          reindexTaskPercComplete: 1,
        },
        warnings: [],
        hasRequiredPrivileges: true,
        meta: defaultReindexStatusMeta,
      });

      await openReindexFlyout();
      await proceedToReindexProgress();

      await waitFor(() => {
        expect(screen.getByTestId('reindexChecklistTitle')).toHaveTextContent(
          'Reindexing in progress… 90%'
        );
      });
      expect(screen.queryByTestId('cancelReindexingDocumentsButton')).toBeNull();
    });

    it('has completed', async () => {
      httpRequestsMockHelpers.setReindexStatusResponse(MOCK_REINDEX_DEPRECATION.index!, {
        reindexOp: {
          status: ReindexStatus.completed,
          lastCompletedStep: ReindexStep.aliasCreated,
          reindexTaskPercComplete: 1,
        },
        warnings: [],
        hasRequiredPrivileges: true,
        meta: defaultReindexStatusMeta,
      });

      await openReindexFlyout();
      await proceedToReindexProgress();

      await waitFor(() => {
        expect(screen.getByTestId('reindexChecklistTitle')).toHaveTextContent(
          'Reindexing in progress… 95%'
        );
      });
      expect(screen.queryByTestId('cancelReindexingDocumentsButton')).toBeNull();
    });
  });

  describe('low disk space', () => {
    it('renders a warning callout if nodes detected with low disk space', async () => {
      httpRequestsMockHelpers.setLoadNodeDiskSpaceResponse([
        {
          nodeId: '9OFkjpAKS_aPzJAuEOSg7w',
          nodeName: 'MacBook-Pro.local',
          available: '25%',
        },
      ]);

      const flyout = await openReindexFlyout();
      await proceedToReindexProgress();

      expect(await within(flyout).findByTestId('lowDiskSpaceCallout')).toHaveTextContent(
        'Nodes with low disk space'
      );
      expect(within(flyout).getAllByTestId('impactedNodeListItem')).toHaveLength(1);
      expect(within(flyout).getAllByTestId('impactedNodeListItem')[0]).toHaveTextContent(
        'MacBook-Pro.local (25% available)'
      );
    });
  });
});
