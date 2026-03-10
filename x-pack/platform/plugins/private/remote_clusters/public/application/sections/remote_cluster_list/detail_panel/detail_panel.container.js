/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { DetailPanel as DetailPanelView } from './detail_panel';

import {
  isDetailPanelOpen,
  getDetailPanelCluster,
  getDetailPanelClusterName,
  isLoading,
} from '../../../store/selectors';

import { closeDetailPanel } from '../../../store/actions';

/** @type {import('react-redux').MapStateToProps<any, any, any>} */
const mapStateToProps = (state) => {
  return {
    isOpen: isDetailPanelOpen(state),
    isLoading: isLoading(state),
    cluster: getDetailPanelCluster(state),
    clusterName: getDetailPanelClusterName(state),
  };
};

/** @type {import('react-redux').MapDispatchToProps<any, any>} */
const mapDispatchToProps = (dispatch) => {
  return {
    closeDetailPanel: () => {
      dispatch(closeDetailPanel());
    },
  };
};

/**
 * @type {import('react-redux').ConnectedComponent<typeof DetailPanelView, {}>}
 */
export const DetailPanel = connect(mapStateToProps, mapDispatchToProps)(DetailPanelView);
