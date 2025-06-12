/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { Cluster, ClusterPayload } from '../../../../common/lib';
import { RemoteClusterEdit as RemoteClusterEditView } from './remote_cluster_edit';

import {
  isLoading,
  getEditedCluster,
  isEditingCluster,
  getEditClusterError,
} from '../../store/selectors';

import {
  editCluster,
  startEditingCluster,
  stopEditingCluster,
  clearEditClusterErrors,
  openDetailPanel,
} from '../../store/actions';

const mapStateToProps = (state: any) => {
  return {
    isLoading: isLoading(state),
    cluster: getEditedCluster(state),
    isEditingCluster: isEditingCluster(state),
    getEditClusterError: getEditClusterError(state),
  };
};

const mapDispatchToProps = (dispatch: (action: any) => void) => {
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
  cluster: Cluster;
  startEditingCluster: (clusterName: string) => void;
  stopEditingCluster: () => void;
  editCluster: (cluster: ClusterPayload) => void;
  isEditingCluster: boolean;
  getEditClusterError?: object;
  clearEditClusterErrors: () => void;
  openDetailPanel: (clusterName: string) => void;
}

export const RemoteClusterEdit: React.FC<Props> = connect(
  mapStateToProps,
  mapDispatchToProps
)(RemoteClusterEditView);
