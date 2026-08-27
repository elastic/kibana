/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux-v7';
import type { ClusterPayload } from '../../../../common/lib';
import { RemoteClusterAdd as RemoteClusterAddView } from './remote_cluster_add';

import { isAddingCluster, getAddClusterError } from '../../store/selectors';

import { addCluster, clearAddClusterErrors } from '../../store/actions';
import type { AppDispatch, RemoteClustersState } from '../../store/types';

const mapStateToProps = (state: RemoteClustersState) => {
  return {
    isAddingCluster: isAddingCluster(state),
    addClusterError: getAddClusterError(state),
  };
};

const mapDispatchToProps = (dispatch: AppDispatch) => {
  return {
    addCluster: (cluster: ClusterPayload) => {
      dispatch(addCluster(cluster));
    },
    clearAddClusterErrors: () => {
      dispatch(clearAddClusterErrors());
    },
  };
};

export const RemoteClusterAdd = connect(mapStateToProps, mapDispatchToProps)(RemoteClusterAddView);
