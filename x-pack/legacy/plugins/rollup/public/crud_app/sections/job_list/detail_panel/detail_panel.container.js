/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { DetailPanel as DetailPanelView } from './detail_panel';

import {
  isDetailPanelOpen,
  getDetailPanelType,
  getDetailPanelJob,
  getDetailPanelJobId,
  isLoading,
} from '../../../store/selectors';

import { closeDetailPanel, openDetailPanel } from '../../../store/actions';

const mapStateToProps = state => {
  return {
    isOpen: isDetailPanelOpen(state),
    isLoading: isLoading(state),
    job: getDetailPanelJob(state),
    jobId: getDetailPanelJobId(state),
    panelType: getDetailPanelType(state),
  };
};

const mapDispatchToProps = dispatch => {
  return {
    closeDetailPanel: () => {
      dispatch(closeDetailPanel());
    },
    openDetailPanel: ({ panelType, jobId }) => {
      dispatch(openDetailPanel({ panelType, jobId }));
    },
  };
};

export const DetailPanel = connect(mapStateToProps, mapDispatchToProps)(DetailPanelView);
