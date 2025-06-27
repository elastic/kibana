/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { ReindexStatus, ReindexStep, ReindexStatusResponse } from '../../../common/types';
import { setupEnvironment } from '../helpers';
import { ElasticsearchTestBed, setupElasticsearchPage } from './es_deprecations.helpers';
import {
  esDeprecationsMockResponse,
  MOCK_SNAPSHOT_ID,
  MOCK_JOB_ID,
  MOCK_REINDEX_DEPRECATION,
} from './mocked_responses';

const defaultReindexStatusMeta: ReindexStatusResponse['meta'] = {
  indexName: 'foo',
  reindexName: 'reindexed-foo',
  aliases: [],
  isFrozen: false,
  isReadonly: false,
  isInDataStream: false,
  isFollowerIndex: false,
};

describe('Readonly index modal', () => {
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

    await act(async () => {
      testBed = await setupElasticsearchPage(httpSetup);
    });

    testBed.component.update();
  });

  describe('low disk space', () => {
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
        deprecationType: 'reindex',
        index: 0,
        action: 'readonly',
      });

      expect(find('lowDiskSpaceCallout').text()).toContain('Nodes with low disk space');
      expect(find('impactedNodeListItem').length).toEqual(1);
      expect(find('impactedNodeListItem').at(0).text()).toContain(
        'MacBook-Pro.local (25% available)'
      );
    });
  });

  describe('readonly', () => {
    it('renders a modal with index confirm step for read-only', async () => {
      const { actions, find, exists } = testBed;

      await actions.table.clickDeprecationRowAt({
        deprecationType: 'reindex',
        index: 0,
        action: 'readonly',
      });

      expect(exists('updateIndexModal')).toBe(true);
      expect(find('updateIndexModalTitle').text()).toContain('Set index to read-only');
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

      const { actions, find, exists } = testBed;

      await actions.table.clickDeprecationRowAt({
        deprecationType: 'reindex',
        index: 0,
        action: 'readonly',
      });
      await actions.reindexDeprecationFlyout.clickReadOnlyButton();

      expect(exists('updateIndexModalTitle')).toBe(true);
      expect(find('updateIndexModalTitle').text()).toBe('Setting index to read-only');

      expect(exists('stepProgressStep')).toBe(true);
      expect(find('stepProgressStep').text()).toBe('Setting foo index to read-only.');
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

      await act(async () => {
        testBed = await setupElasticsearchPage(httpSetup);
      });

      testBed.component.update();

      const { actions, exists } = testBed;

      await actions.table.clickDeprecationRowAt({
        deprecationType: 'reindex',
        index: 0,
        action: 'readonly',
      });

      // Verify follower index callout is displayed
      expect(exists('followerIndexCallout')).toBe(true);

      // Verify only mark as read-only button is available (no reindex button)
      expect(exists('startIndexReadonlyButton')).toBe(true);
      expect(exists('startReindexingButton')).toBe(false);
    });
  });
});
