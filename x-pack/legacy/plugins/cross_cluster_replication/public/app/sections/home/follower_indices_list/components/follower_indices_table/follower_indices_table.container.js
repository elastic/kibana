/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { SECTIONS } from '../../../../../constants';
import { selectDetailFollowerIndex } from '../../../../../store/actions';
import { getApiStatus } from '../../../../../store/selectors';
import { FollowerIndicesTable as FollowerIndicesTableComponent } from './follower_indices_table';

const scope = SECTIONS.FOLLOWER_INDEX;

const mapStateToProps = state => ({
  apiStatusDelete: getApiStatus(`${scope}-delete`)(state),
});
//
const mapDispatchToProps = dispatch => ({
  selectFollowerIndex: name => dispatch(selectDetailFollowerIndex(name)),
});

export const FollowerIndicesTable = connect(
  mapStateToProps,
  mapDispatchToProps
)(FollowerIndicesTableComponent);
