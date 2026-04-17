/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import type { Cluster, ClusterPayload } from '../../../../common/lib';
import type { RequestError } from '../../../types';
import { RemoteClusterEdit as RemoteClusterEditView } from './remote_cluster_edit';

import {
  isLoading,
  getEditedCluster,
  isEditingCluster,
  getEditClusterError,
} from '../../store/selectors';
import type { AppDispatch, RemoteClustersState } from '../../store/types';

import {
  editCluster,
  startEditingCluster,
  stopEditingCluster,
  clearEditClusterErrors,
  openDetailPanel,
} from '../../store/actions';

const mapStateToProps = (state: RemoteClustersState) => {
  return {
    isLoading: isLoading(state),
    cluster: getEditedCluster(state),
    isEditingCluster: isEditingCluster(state),
    getEditClusterError: getEditClusterError(state),
  };
};

const mapDispatchToProps = (dispatch: AppDispatch) => {
  return {
    startEditingCluster: (clusterName: string) => {
      dispatch(startEditingCluster({ clusterName }));
    },
    stopEditingCluster: () => {
      dispatch(stopEditingCluster());
    },
    editCluster: (cluster: ClusterPayload) => {
      dispatch(editCluster(cluster));
    },
    clearEditClusterErrors: () => {
      dispatch(clearEditClusterErrors());
    },
    openDetailPanel: (clusterName: string) => {
      dispatch(openDetailPanel({ name: clusterName }));
    },
  };
};

interface Props {
  isLoading: boolean;
  cluster: Cluster | undefined;
  startEditingCluster: (clusterName: string) => void;
  stopEditingCluster: () => void;
  editCluster: (cluster: ClusterPayload) => void;
  isEditingCluster: boolean;
  getEditClusterError?: RequestError;
  clearEditClusterErrors: () => void;
  openDetailPanel: (clusterName: string) => void;
}

export const RemoteClusterEdit: React.FC<Props> = connect(
  mapStateToProps,
  mapDispatchToProps
)(RemoteClusterEditView);
