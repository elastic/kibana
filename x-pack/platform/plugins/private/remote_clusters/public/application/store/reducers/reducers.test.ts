/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_MODEL, SNIFF_MODE } from '../../../../common/constants';
import {
  LOAD_CLUSTERS_FAILURE,
  LOAD_CLUSTERS_SUCCESS,
  REFRESH_CLUSTERS_SUCCESS,
  ADD_CLUSTER_START,
  ADD_CLUSTER_FAILURE,
  EDIT_CLUSTER_START,
  EDIT_CLUSTER_FAILURE,
} from '../action_types';
import type { RemoteCluster, RemoteClustersAction } from '../types';
import { addCluster } from './add_cluster';
import { clusters } from './clusters';
import { editCluster } from './edit_cluster';

const makeCluster = (name: string): RemoteCluster => ({
  name,
  seeds: ['localhost:9300'],
  isConnected: true,
  mode: SNIFF_MODE,
  securityModel: SECURITY_MODEL.CERTIFICATE,
});

describe('clusters reducer', () => {
  describe('WHEN LOAD_CLUSTERS_SUCCESS follows LOAD_CLUSTERS_FAILURE', () => {
    it('SHOULD clear clusterLoadError and isLoading', () => {
      const failedState = clusters(undefined, {
        type: LOAD_CLUSTERS_FAILURE,
        payload: { error: { status: 500, message: 'boom' } },
      });
      expect(failedState.clusterLoadError).toEqual({ status: 500, message: 'boom' });

      const successState = clusters(failedState, {
        type: LOAD_CLUSTERS_SUCCESS,
        payload: { clusters: [makeCluster('c1')] },
      });

      expect(successState.clusterLoadError).toBeNull();
      expect(successState.isLoading).toBe(false);
      expect(successState.asList).toHaveLength(1);
    });
  });

  describe('WHEN REFRESH_CLUSTERS_SUCCESS follows LOAD_CLUSTERS_FAILURE', () => {
    it('SHOULD clear clusterLoadError and isLoading', () => {
      const failedState = clusters(undefined, {
        type: LOAD_CLUSTERS_FAILURE,
        payload: { error: { status: 500, message: 'boom' } },
      });

      const refreshedState = clusters(failedState, {
        type: REFRESH_CLUSTERS_SUCCESS,
        payload: { clusters: [makeCluster('c1')] },
      });

      expect(refreshedState.clusterLoadError).toBeNull();
      expect(refreshedState.isLoading).toBe(false);
      expect(refreshedState.asList).toHaveLength(1);
    });
  });
});

describe('addCluster reducer', () => {
  describe('WHEN ADD_CLUSTER_START follows ADD_CLUSTER_FAILURE', () => {
    it('SHOULD reset error from the previous add attempt', () => {
      const failAction: RemoteClustersAction = {
        type: ADD_CLUSTER_FAILURE,
        payload: { error: { message: 'conflict' } },
      };
      const failedState = addCluster(undefined, failAction);
      expect(failedState.error).toEqual({ message: 'conflict' });
      expect(failedState.isAdding).toBe(false);

      const startAction: RemoteClustersAction = {
        type: ADD_CLUSTER_START,
      };
      const startedState = addCluster(failedState, startAction);

      expect(startedState.error).toBeUndefined();
      expect(startedState.isAdding).toBe(true);
    });
  });
});

describe('editCluster reducer', () => {
  describe('WHEN EDIT_CLUSTER_START follows EDIT_CLUSTER_FAILURE', () => {
    it('SHOULD reset error and isEditing from the previous edit', () => {
      const failAction: RemoteClustersAction = {
        type: EDIT_CLUSTER_FAILURE,
        payload: { error: { message: 'conflict' } },
      };
      const failedState = editCluster(undefined, failAction);
      expect(failedState.error).toEqual({ message: 'conflict' });
      expect(failedState.isEditing).toBe(false);

      const startAction: RemoteClustersAction = {
        type: EDIT_CLUSTER_START,
        payload: { clusterName: 'new-cluster' },
      };
      const startedState = editCluster(failedState, startAction);

      expect(startedState.clusterName).toBe('new-cluster');
      expect(startedState.error).toBeUndefined();
      expect(startedState.isEditing).toBe(false);
    });
  });
});
