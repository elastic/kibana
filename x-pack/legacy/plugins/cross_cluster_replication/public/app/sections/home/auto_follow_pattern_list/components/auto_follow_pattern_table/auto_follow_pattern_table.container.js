/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { SECTIONS } from '../../../../../constants';
import { selectDetailAutoFollowPattern } from '../../../../../store/actions';
import { getApiStatus } from '../../../../../store/selectors';
import { AutoFollowPatternTable as AutoFollowPatternTableComponent } from './auto_follow_pattern_table';

const scope = SECTIONS.AUTO_FOLLOW_PATTERN;

const mapStateToProps = state => ({
  apiStatusDelete: getApiStatus(`${scope}-delete`)(state),
});

const mapDispatchToProps = dispatch => ({
  selectAutoFollowPattern: name => dispatch(selectDetailAutoFollowPattern(name)),
});

export const AutoFollowPatternTable = connect(
  mapStateToProps,
  mapDispatchToProps
)(AutoFollowPatternTableComponent);
