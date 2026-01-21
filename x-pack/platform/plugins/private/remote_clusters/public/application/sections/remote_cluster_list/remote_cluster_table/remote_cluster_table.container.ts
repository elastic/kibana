/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';

import { openDetailPanel } from '../../../store/actions';

import { RemoteClusterTable as RemoteClusterTableComponent } from './remote_cluster_table';

/** @type {import('react-redux').MapDispatchToProps<any, any>} */
const mapDispatchToProps = (dispatch) => {
  return {
    openDetailPanel: (clusterName) => {
      dispatch(openDetailPanel({ name: clusterName }));
    },
  };
};

/**
 * @type {import('react-redux').ConnectedComponent<typeof RemoteClusterTableComponent, {}>}
 */
export const RemoteClusterTable = connect(
  undefined,
  mapDispatchToProps
)(RemoteClusterTableComponent);
