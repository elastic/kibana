/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { ClusterPayload } from '../../../../common/lib';
import { RemoteClusterAdd as RemoteClusterAddView } from './remote_cluster_add';

import { isAddingCluster, getAddClusterError } from '../../store/selectors';

import { addCluster, clearAddClusterErrors } from '../../store/actions';

const mapStateToProps = (state: any) => {
  return {
    isAddingCluster: isAddingCluster(state),
    addClusterError: getAddClusterError(state),
  };
};

const mapDispatchToProps = (dispatch: (action: any) => void) => {
  return {
    addCluster: (cluster: ClusterPayload) => {
      dispatch(addCluster(cluster));
    },
    clearAddClusterErrors: () => {
      dispatch(clearAddClusterErrors());
    },
  };
};

interface Props {
  addCluster: (cluster: ClusterPayload) => void;
  isAddingCluster: boolean;
  addClusterError?: { message: string };
  clearAddClusterErrors: () => void;
}

export const RemoteClusterAdd: React.FC<Props> = connect(
  mapStateToProps,
  mapDispatchToProps
)(RemoteClusterAddView);
