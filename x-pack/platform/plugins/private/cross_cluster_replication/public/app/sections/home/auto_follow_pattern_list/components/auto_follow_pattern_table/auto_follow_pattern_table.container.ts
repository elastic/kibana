/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';

import { SECTIONS } from '../../../../../constants';
import type { CcrState } from '../../../../../store';
import {
  selectDetailAutoFollowPattern,
  pauseAutoFollowPattern,
  resumeAutoFollowPattern,
} from '../../../../../store/actions';
import { getApiStatus } from '../../../../../store/selectors';
import { AutoFollowPatternTable as AutoFollowPatternTableComponent } from './auto_follow_pattern_table';

const scope = SECTIONS.AUTO_FOLLOW_PATTERN;

type CcrDispatch = ThunkDispatch<CcrState, undefined, AnyAction>;

const mapStateToProps = (state: CcrState) => ({
  apiStatusDelete: getApiStatus(`${scope}-delete`)(state),
});

const mapDispatchToProps = (dispatch: CcrDispatch) => ({
  selectAutoFollowPattern: (name: string) => dispatch(selectDetailAutoFollowPattern(name)),
  pauseAutoFollowPattern: (name: string) => dispatch(pauseAutoFollowPattern(name)),
  resumeAutoFollowPattern: (name: string) => dispatch(resumeAutoFollowPattern(name)),
});

export const AutoFollowPatternTable = connect(
  mapStateToProps,
  mapDispatchToProps
)(AutoFollowPatternTableComponent);
