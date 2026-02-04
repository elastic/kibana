/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

describe('Readonly index modal', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let user: ReturnType<typeof userEvent.setup>;

  const openReadOnlyModal = async () => {
    await user.click(screen.getAllByTestId('deprecation-reindex-readonly')[0]);
    return await screen.findByTestId('updateIndexModal');
  };

  beforeEach(() => {
    user = userEvent.setup();
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

      await setupElasticsearchPage(httpSetup);
      const modal = await openReadOnlyModal();

      expect(await within(modal).findByTestId('lowDiskSpaceCallout')).toHaveTextContent(
        'Nodes with low disk space'
      );
      expect(within(modal).getAllByTestId('impactedNodeListItem')).toHaveLength(1);
      expect(within(modal).getAllByTestId('impactedNodeListItem')[0]).toHaveTextContent(
        'MacBook-Pro.local (25% available)'
      );
    });
  });

  describe('readonly', () => {
    it('renders a modal with index confirm step for read-only', async () => {
      await setupElasticsearchPage(httpSetup);
      const modal = await openReadOnlyModal();

      expect(modal).toBeInTheDocument();
      expect(within(modal).getByTestId('updateIndexModalTitle')).toHaveTextContent(
        'Set index to read-only'
      );
    });

    it('shows success state when marking as readonly an index that has failed to reindex', async () => {
      httpRequestsMockHelpers.setReindexStatusResponse(MOCK_REINDEX_DEPRECATION.index!, {
        reindexOp: {
          status: ReindexStatus.failed,
          lastCompletedStep: ReindexStep.reindexCompleted,
          reindexTaskPercComplete: 1,
        },
        warnings: [],
        hasRequiredPrivileges: true,
        meta: defaultReindexStatusMeta,
      });

      await setupElasticsearchPage(httpSetup);
      const modal = await openReadOnlyModal();

      await user.click(within(modal).getByTestId('startIndexReadonlyButton'));

      expect(await screen.findByTestId('updateIndexModalTitle')).toHaveTextContent(
        'Setting index to read-only'
      );

      expect(screen.getByTestId('stepProgressStep')).toHaveTextContent(
        'Setting foo index to read-only.'
      );
    });
  });

  describe('follower index', () => {
    it('displays follower index callout and only shows mark as read-only button when index is a follower index', async () => {
      httpRequestsMockHelpers.setReindexStatusResponse(MOCK_REINDEX_DEPRECATION.index!, {
        reindexOp: null,
        warnings: [],
        hasRequiredPrivileges: true,
        meta: {
          ...defaultReindexStatusMeta,
          isFollowerIndex: true,
        },
      });

      await setupElasticsearchPage(httpSetup);
      const modal = await openReadOnlyModal();

      // Verify follower index callout is displayed
      expect(within(modal).getByTestId('followerIndexCallout')).toBeInTheDocument();

      // Verify only mark as read-only button is available (no reindex button)
      expect(within(modal).getByTestId('startIndexReadonlyButton')).toBeInTheDocument();
      expect(within(modal).queryByTestId('startReindexingButton')).toBeNull();
    });
  });
});
