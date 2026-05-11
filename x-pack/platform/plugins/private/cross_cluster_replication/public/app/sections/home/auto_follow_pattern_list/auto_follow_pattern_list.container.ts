/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';

import { SECTIONS } from '../../../constants';
import type { CcrState } from '../../../store';
import {
  getListAutoFollowPatterns,
  getSelectedAutoFollowPatternId,
  getApiStatus,
  getApiError,
  isApiAuthorized,
} from '../../../store/selectors';
import {
  loadAutoFollowPatterns,
  selectDetailAutoFollowPattern,
  loadAutoFollowStats,
} from '../../../store/actions';
import { AutoFollowPatternList as AutoFollowPatternListView } from './auto_follow_pattern_list';

const scope = SECTIONS.AUTO_FOLLOW_PATTERN;

type CcrDispatch = ThunkDispatch<CcrState, undefined, AnyAction>;

const mapStateToProps = (state: CcrState) => ({
  autoFollowPatterns: getListAutoFollowPatterns(state),
  autoFollowPatternId: getSelectedAutoFollowPatternId('detail')(state),
  apiStatus: getApiStatus(scope)(state),
  apiError: getApiError(scope)(state),
  isAuthorized: isApiAuthorized(scope)(state),
});

const mapDispatchToProps = (dispatch: CcrDispatch) => ({
  loadAutoFollowPatterns: (inBackground?: boolean) =>
    dispatch(loadAutoFollowPatterns(inBackground)),
  selectAutoFollowPattern: (id: string | null) => dispatch(selectDetailAutoFollowPattern(id)),
  loadAutoFollowStats: () => dispatch(loadAutoFollowStats()),
});

export const AutoFollowPatternList = connect(
  mapStateToProps,
  mapDispatchToProps
)(AutoFollowPatternListView);
