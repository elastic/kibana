/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import type { RouteComponentProps } from 'react-router-dom';

import { SECTIONS } from '../../constants';
import type { CcrState } from '../../store';
import {
  getListAutoFollowPatterns,
  getListFollowerIndices,
  isApiAuthorized,
} from '../../store/selectors';
import { CrossClusterReplicationHome as CrossClusterReplicationHomeView } from './home';

const mapStateToProps = (state: CcrState) => ({
  autoFollowPatterns: getListAutoFollowPatterns(state),
  isAutoFollowApiAuthorized: isApiAuthorized(SECTIONS.AUTO_FOLLOW_PATTERN)(state),
  followerIndices: getListFollowerIndices(state),
  isFollowerIndexApiAuthorized: isApiAuthorized(SECTIONS.FOLLOWER_INDEX)(state),
});

type CrossClusterReplicationHomeOwnProps = RouteComponentProps<{ section: string }>;
type CrossClusterReplicationHomeStateProps = ReturnType<typeof mapStateToProps>;

export const CrossClusterReplicationHome = connect<
  CrossClusterReplicationHomeStateProps,
  {},
  CrossClusterReplicationHomeOwnProps,
  CcrState
>(mapStateToProps)(CrossClusterReplicationHomeView);
