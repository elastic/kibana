/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiIndex, connectorIndex } from '../../__mocks__/view_index.mock';
import { LogicMounter, mockFlashMessageHelpers } from '../../__mocks__';

import { SyncStatus, IngestionMethod, IngestionStatus } from '@kbn/search-connectors';
import { nextTick } from '@kbn/test-jest-helpers';

import { StartSyncApiLogic } from '../../api/connector/start_sync_api_logic';
import { CachedFetchIndexApiLogic } from '../../api/index/cached_fetch_index_api_logic';

import { indexToViewIndex } from '../../utils/indices';

import { IndexNameLogic } from './index_name_logic';
import { IndexViewLogic } from './index_view_logic';
import { Status } from '../../../common/types/api';
import { httpServiceMock } from '@kbn/core/public/mocks';

// We can't test fetchTimeOutId because this will get set whenever the logic is created
// And the timeoutId is non-deterministic. We use expect.object.containing throughout this test file
const DEFAULT_VALUES = {
  connector: undefined,
  connectorError: undefined,
  connectorId: null,
  error: null,
  fetchIndexApiData: {},
  fetchIndexApiStatus: Status.SUCCESS,
  hasAdvancedFilteringFeature: false,
  hasBasicFilteringFeature: false,
  hasDocumentLevelSecurityFeature: false,
  hasFilteringFeature: false,
  hasIncrementalSyncFeature: false,
  htmlExtraction: undefined,
  index: {
    ingestionMethod: IngestionMethod.API,
    ingestionStatus: IngestionStatus.CONNECTED,
    lastUpdated: null,
  },
  indexData: {},
  indexName: 'index-name',
  ingestionMethod: IngestionMethod.API,
  ingestionStatus: IngestionStatus.CONNECTED,
  isCanceling: false,
  isConnectorIndex: false,
  isHiddenIndex: false,
  isInitialLoading: false,
  isSyncing: false,
  isWaitingForSync: false,
  lastUpdated: null,
  pipelineData: undefined,
  recheckIndexLoading: false,
  syncStatus: null,
  syncTriggeredLocally: false,
};

const CONNECTOR_VALUES = {
  ...DEFAULT_VALUES,
  connectorId: connectorIndex.connector.id,
  index: indexToViewIndex(connectorIndex),
  indexData: connectorIndex,
  ingestionMethod: IngestionMethod.CONNECTOR,
  ingestionStatus: IngestionStatus.CONFIGURED,
  lastUpdated: 'never',
};

describe('IndexViewLogic', () => {
  const { mount: apiLogicMount } = new LogicMounter(StartSyncApiLogic);
  const { mount: fetchIndexMount } = new LogicMounter(CachedFetchIndexApiLogic);
  const { mount: indexNameMount } = new LogicMounter(IndexNameLogic);
  const { mount } = new LogicMounter(IndexViewLogic);
  const { flashSuccessToast } = mockFlashMessageHelpers;
  const http = httpServiceMock.createSetupContract();
  let resultIndexViewLogic = IndexViewLogic;
  let resultCachedFetchIndexApiLogic = CachedFetchIndexApiLogic;
  let resultIndexNameLogic = IndexNameLogic;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    http.get.mockReturnValueOnce(Promise.resolve({}));
    resultIndexNameLogic = indexNameMount({}, { http });
    apiLogicMount({}, { http });
    resultCachedFetchIndexApiLogic = fetchIndexMount({}, { http });
    resultIndexViewLogic = mount({}, { http });
    resultIndexNameLogic.actions.setIndexName('index-name');
  });

  it('has expected default values', () => {
    expect(resultIndexViewLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('FetchIndexApiWrapperLogic.apiSuccess', () => {
      it('should update values', () => {
        resultCachedFetchIndexApiLogic.actions.apiSuccess({
          ...CONNECTOR_VALUES.index,
          has_pending_syncs: true,
        });

        expect(resultIndexViewLogic.values).toEqual(
          expect.objectContaining({
            ingestionMethod: CONNECTOR_VALUES.ingestionMethod,
            ingestionStatus: CONNECTOR_VALUES.ingestionStatus,
            isCanceling: false,
            isConnectorIndex: true,
            isWaitingForSync: true,
            lastUpdated: CONNECTOR_VALUES.lastUpdated,
            pipelineData: undefined,
            syncStatus: SyncStatus.COMPLETED,
          })
        );
      });

      it('should update values with no connector', () => {
        resultCachedFetchIndexApiLogic.actions.apiSuccess(apiIndex);

        expect(resultIndexViewLogic.values).toEqual(
          expect.objectContaining({
            ...DEFAULT_VALUES,
            fetchIndexApiData: { ...apiIndex },
            fetchIndexApiStatus: Status.SUCCESS,
            index: apiIndex,
            indexData: apiIndex,
            isInitialLoading: false,
          })
        );
      });
      it('should flash success if recheckFetchIndexLoading', () => {
        resultIndexViewLogic.actions.resetRecheckIndexLoading = jest.fn();
        resultIndexNameLogic.actions.setIndexName('api');
        resultIndexViewLogic.actions.recheckIndex();
        resultCachedFetchIndexApiLogic.actions.apiSuccess(apiIndex);

        expect(flashSuccessToast).toHaveBeenCalled();
      });
    });

    describe('startSync', () => {
      it('should call makeStartSyncRequest', async () => {
        // TODO: replace with mounting connectorIndex to FetchIndexApiDirectly to avoid
        // needing to mock out actions unrelated to test called by listeners
        resultCachedFetchIndexApiLogic.actions.apiSuccess(connectorIndex);
        resultIndexViewLogic.actions.makeStartSyncRequest = jest.fn();

        resultIndexViewLogic.actions.startSync();
        await nextTick();

        expect(resultIndexViewLogic.actions.makeStartSyncRequest).toHaveBeenCalledWith({
          connectorId: '2',
          http,
        });
      });
    });

    describe('StartSyncApiLogic.apiSuccess', () => {
      it('should set localSyncNow to true', async () => {
        StartSyncApiLogic.actions.apiSuccess({});
        expect(resultIndexViewLogic.values).toEqual(
          expect.objectContaining({
            ...DEFAULT_VALUES,
            isWaitingForSync: true,
            syncTriggeredLocally: true,
          })
        );
      });
    });
  });

  describe('recheckIndexLoading', () => {
    it('should be set to true on recheckIndex', () => {
      resultIndexViewLogic.actions.recheckIndex();
      expect(resultIndexViewLogic.values).toEqual(
        expect.objectContaining({
          ...DEFAULT_VALUES,
          fetchIndexApiStatus: Status.LOADING,
          recheckIndexLoading: true,
        })
      );
    });
    it('should be set to false on resetRecheckIndexLoading', () => {
      resultIndexViewLogic.actions.recheckIndex();
      resultIndexViewLogic.actions.resetRecheckIndexLoading();
      expect(resultIndexViewLogic.values).toEqual(
        expect.objectContaining({
          ...DEFAULT_VALUES,
          fetchIndexApiStatus: Status.LOADING,
          recheckIndexLoading: false,
        })
      );
    });
  });

  describe('listeners', () => {
    it('calls makeFetchIndexRequest on fetchIndex', () => {
      resultIndexViewLogic.actions.makeFetchIndexRequest = jest.fn();
      IndexNameLogic.actions.setIndexName('indexName');
      resultIndexViewLogic.actions.fetchIndex();
      expect(resultIndexViewLogic.actions.makeFetchIndexRequest).toHaveBeenCalledWith({
        http,
        indexName: 'indexName',
      });
    });
  });

  describe('selectors', () => {
    describe('error', () => {
      it('should return connector error if available', () => {
        resultIndexViewLogic.actions.fetchIndexApiSuccess({
          ...CONNECTOR_VALUES.index,
          connector: { ...connectorIndex.connector, error: 'error' },
        });
        expect(resultIndexViewLogic.values.error).toEqual('error');
      });
      it('should return connector last sync error if available and error is undefined', () => {
        resultIndexViewLogic.actions.fetchIndexApiSuccess({
          ...CONNECTOR_VALUES.index,
          connector: { ...connectorIndex.connector, last_sync_error: 'last sync error' },
        });
        expect(resultIndexViewLogic.values.error).toEqual('last sync error');
      });
    });
  });
});
