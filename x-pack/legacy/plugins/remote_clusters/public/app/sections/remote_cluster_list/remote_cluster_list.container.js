/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import {
  isDetailPanelOpen,
  getClustersList,
  isLoading,
  isEditingCluster,
  isRemovingCluster,
  clusterLoadError,
} from '../../store/selectors';

import {
  loadClusters,
  refreshClusters,
  openDetailPanel,
  closeDetailPanel,
} from '../../store/actions';

import { RemoteClusterList as RemoteClusterListView } from './remote_cluster_list';

const mapStateToProps = (state) => {
  return {
    clusters: getClustersList(state),
    isDetailPanelOpen: isDetailPanelOpen(state),
    isLoading: isLoading(state),
    isCopyingCluster: isEditingCluster(state),
    isRemovingCluster: isRemovingCluster(state),
    clusterLoadError: clusterLoadError(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    loadClusters: () => {
      dispatch(loadClusters());
    },
    refreshClusters: () => {
      dispatch(refreshClusters());
    },
    openDetailPanel: (name) => {
      dispatch(openDetailPanel({ name }));
    },
    closeDetailPanel: () => {
      dispatch(closeDetailPanel());
    },
  };
};

export const RemoteClusterList = connect(mapStateToProps, mapDispatchToProps)(RemoteClusterListView);

