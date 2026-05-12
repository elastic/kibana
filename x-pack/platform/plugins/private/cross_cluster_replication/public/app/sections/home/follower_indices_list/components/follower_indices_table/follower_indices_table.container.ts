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
import { selectDetailFollowerIndex } from '../../../../../store/actions';
import { getApiStatus } from '../../../../../store/selectors';
import { FollowerIndicesTable as FollowerIndicesTableComponent } from './follower_indices_table';

const scope = SECTIONS.FOLLOWER_INDEX;

type CcrDispatch = ThunkDispatch<CcrState, undefined, AnyAction>;

const mapStateToProps = (state: CcrState) => ({
  apiStatusDelete: getApiStatus(`${scope}-delete`)(state),
});

const mapDispatchToProps = (dispatch: CcrDispatch) => ({
  selectFollowerIndex: (name: string) => dispatch(selectDetailFollowerIndex(name)),
});

export const FollowerIndicesTable = connect(
  mapStateToProps,
  mapDispatchToProps
)(FollowerIndicesTableComponent);
