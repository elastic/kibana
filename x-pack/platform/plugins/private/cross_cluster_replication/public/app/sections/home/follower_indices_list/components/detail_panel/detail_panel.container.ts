/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';

import type { ApiStatus, FollowerIndexWithPausedStatus } from '../../../../../../../common/types';
import { DetailPanel as DetailPanelView } from './detail_panel';

import {
  getSelectedFollowerIndex,
  getSelectedFollowerIndexId,
  getApiStatus,
} from '../../../../../store/selectors';
import { getFollowerIndex } from '../../../../../store/actions';
import { SECTIONS } from '../../../../../constants';
import type { CcrState } from '../../../../../store';

const scope = SECTIONS.FOLLOWER_INDEX;

type CcrDispatch = ThunkDispatch<CcrState, undefined, AnyAction>;

interface StateProps {
  followerIndexId: string | null;
  followerIndex: FollowerIndexWithPausedStatus | null;
  apiStatus: ApiStatus;
}

interface DispatchProps {
  getFollowerIndex: (id: string) => void;
}

const mapStateToProps = (state: CcrState): StateProps => ({
  followerIndexId: getSelectedFollowerIndexId('detail')(state),
  followerIndex: getSelectedFollowerIndex('detail')(state),
  apiStatus: getApiStatus(scope)(state),
});

const mapDispatchToProps = (dispatch: CcrDispatch): DispatchProps => ({
  getFollowerIndex: (id: string) => dispatch(getFollowerIndex(id)),
});

export const DetailPanel = connect(mapStateToProps, mapDispatchToProps)(DetailPanelView);
