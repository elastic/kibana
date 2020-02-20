/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { SECTIONS } from '../../constants';
import {
  getApiStatus,
  getApiError,
  getSelectedAutoFollowPatternId,
  getSelectedAutoFollowPattern,
} from '../../store/selectors';
import {
  getAutoFollowPattern,
  saveAutoFollowPattern,
  selectEditAutoFollowPattern,
  clearApiError,
} from '../../store/actions';
import { AutoFollowPatternEdit as AutoFollowPatternEditView } from './auto_follow_pattern_edit';

const scope = SECTIONS.AUTO_FOLLOW_PATTERN;

const mapStateToProps = state => ({
  apiStatus: {
    get: getApiStatus(`${scope}-get`)(state),
    save: getApiStatus(`${scope}-save`)(state),
  },
  apiError: {
    get: getApiError(`${scope}-get`)(state),
    save: getApiError(`${scope}-save`)(state),
  },
  autoFollowPatternId: getSelectedAutoFollowPatternId('edit')(state),
  autoFollowPattern: getSelectedAutoFollowPattern('edit')(state),
});

const mapDispatchToProps = dispatch => ({
  getAutoFollowPattern: id => dispatch(getAutoFollowPattern(id)),
  selectAutoFollowPattern: id => dispatch(selectEditAutoFollowPattern(id)),
  saveAutoFollowPattern: (id, autoFollowPattern) =>
    dispatch(saveAutoFollowPattern(id, autoFollowPattern, true)),
  clearApiError: () => {
    dispatch(clearApiError(`${scope}-get`));
    dispatch(clearApiError(`${scope}-save`));
  },
});

export const AutoFollowPatternEdit = connect(
  mapStateToProps,
  mapDispatchToProps
)(AutoFollowPatternEditView);
