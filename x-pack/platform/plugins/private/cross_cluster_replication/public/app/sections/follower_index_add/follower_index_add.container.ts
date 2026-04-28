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
import type { FollowerIndexSaveBody } from '../../services/api';
import type { CcrState } from '../../store';
import { getApiStatus, getApiError } from '../../store/selectors';
import { saveFollowerIndex, clearApiError } from '../../store/actions';
import { FollowerIndexAdd as FollowerIndexAddView } from './follower_index_add';

const scope = SECTIONS.FOLLOWER_INDEX;

type CcrDispatch = ThunkDispatch<CcrState, undefined, AnyAction>;

const mapStateToProps = (state: CcrState) => ({
  apiStatus: getApiStatus(`${scope}-save`)(state),
  apiError: getApiError(`${scope}-save`)(state),
});

const mapDispatchToProps = (dispatch: CcrDispatch) => ({
  saveFollowerIndex: (id: string, followerIndex: FollowerIndexSaveBody) =>
    dispatch(saveFollowerIndex(id, followerIndex)),
  clearApiError: () => dispatch(clearApiError(`${scope}-save`)),
});

export const FollowerIndexAdd = connect(mapStateToProps, mapDispatchToProps)(FollowerIndexAddView);
