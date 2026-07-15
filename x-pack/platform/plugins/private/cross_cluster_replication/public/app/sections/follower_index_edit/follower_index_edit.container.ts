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
import {
  getApiStatus,
  getApiError,
  getSelectedFollowerIndexId,
  getSelectedFollowerIndex,
} from '../../store/selectors';
import {
  saveFollowerIndex,
  clearApiError,
  getFollowerIndex,
  selectEditFollowerIndex,
} from '../../store/actions';
import { FollowerIndexEdit as FollowerIndexEditView } from './follower_index_edit';

const scope = SECTIONS.FOLLOWER_INDEX;

type CcrDispatch = ThunkDispatch<CcrState, undefined, AnyAction>;

const mapStateToProps = (state: CcrState) => ({
  apiStatus: {
    get: getApiStatus(`${scope}-get`)(state),
    save: getApiStatus(`${scope}-save`)(state),
  },
  apiError: {
    get: getApiError(`${scope}-get`)(state),
    save: getApiError(`${scope}-save`)(state),
  },
  followerIndexId: getSelectedFollowerIndexId('edit')(state),
  followerIndex: getSelectedFollowerIndex('edit')(state),
});

const mapDispatchToProps = (dispatch: CcrDispatch) => ({
  getFollowerIndex: (id: string) => dispatch(getFollowerIndex(id)),
  selectFollowerIndex: (id: string | null) => dispatch(selectEditFollowerIndex(id)),
  saveFollowerIndex: (id: string, followerIndex: FollowerIndexSaveBody) =>
    dispatch(saveFollowerIndex(id, followerIndex, true)),
  clearApiError: () => {
    dispatch(clearApiError(`${scope}-get`));
    dispatch(clearApiError(`${scope}-save`));
  },
});

export const FollowerIndexEdit = connect(
  mapStateToProps,
  mapDispatchToProps
)(FollowerIndexEditView);
