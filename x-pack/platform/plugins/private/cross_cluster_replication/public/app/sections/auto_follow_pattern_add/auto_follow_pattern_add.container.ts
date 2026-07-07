/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';

import { SECTIONS } from '../../constants';
import type { AutoFollowPatternCreateConfig } from '../../services/api';
import type { CcrState } from '../../store';
import { getApiStatus, getApiError } from '../../store/selectors';
import { createAutoFollowPattern, clearApiError } from '../../store/actions';
import { AutoFollowPatternAdd as AutoFollowPatternAddView } from './auto_follow_pattern_add';

const scope = SECTIONS.AUTO_FOLLOW_PATTERN;

type CcrDispatch = ThunkDispatch<CcrState, undefined, AnyAction>;

const mapStateToProps = (state: CcrState) => ({
  apiStatus: getApiStatus(`${scope}-save`)(state),
  apiError: getApiError(`${scope}-save`)(state),
});

const mapDispatchToProps = (dispatch: CcrDispatch) => ({
  createAutoFollowPattern: (id: string, autoFollowPattern: AutoFollowPatternCreateConfig) =>
    dispatch(createAutoFollowPattern(id, autoFollowPattern)),
  clearApiError: () => dispatch(clearApiError(`${scope}-save`)),
});

export const AutoFollowPatternAdd = connect(
  mapStateToProps,
  mapDispatchToProps
)(AutoFollowPatternAddView);
