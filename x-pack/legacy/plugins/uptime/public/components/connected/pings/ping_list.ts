/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { AppState } from '../../../state';
import { fetchPings } from '../../../state/api';
import { selectPingList } from '../../../state/selectors';
import { GetPingsParams } from '../../../../common/types/ping/ping';
import { PingListComponent } from '../../functional';

interface OwnProps {
  onSelectedStatusChange: (status: string | undefined) => void;
  onSelectedLocationChange: (location: any) => void;
  onPageCountChange: (itemCount: number) => void;
  pageSize: number;
  selectedOption: string;
  selectedLocation: string | undefined;
}

const mapDispatchToProps = (dispatch: any) => ({
  fetchPings: (params: GetPingsParams) => dispatch(fetchPings({ ...params })),
});

const mapStateToProps = (state: AppState) => ({
  allPings: selectPingList(state),
  loading: state.pingList.loading,
});

export const PingList = connect<
  typeof mapStateToProps,
  typeof mapDispatchToProps,
  OwnProps,
  AppState
>(
  mapStateToProps,
  mapDispatchToProps
)(PingListComponent);
