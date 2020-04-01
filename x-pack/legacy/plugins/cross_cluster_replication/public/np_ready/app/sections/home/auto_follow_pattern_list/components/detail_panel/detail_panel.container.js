/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { DetailPanel as DetailPanelView } from './detail_panel';

import {
  getSelectedAutoFollowPattern,
  getSelectedAutoFollowPatternId,
  getApiStatus,
} from '../../../../../store/selectors';
import { SECTIONS } from '../../../../../constants';

const scope = SECTIONS.AUTO_FOLLOW_PATTERN;

const mapStateToProps = state => ({
  autoFollowPatternId: getSelectedAutoFollowPatternId('detail')(state),
  autoFollowPattern: getSelectedAutoFollowPattern('detail')(state),
  apiStatus: getApiStatus(scope)(state),
});

export const DetailPanel = connect(mapStateToProps)(DetailPanelView);
