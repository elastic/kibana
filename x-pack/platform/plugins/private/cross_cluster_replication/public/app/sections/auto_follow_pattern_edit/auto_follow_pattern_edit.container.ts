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
import type { AutoFollowPatternConfig } from '../../services/api';
import type { CcrState } from '../../store';
import {
  getApiStatus,
  getApiError,
  getSelectedAutoFollowPatternId,
  getSelectedAutoFollowPattern,
} from '../../store/selectors';
import {
  getAutoFollowPattern,
  updateAutoFollowPattern,
  selectEditAutoFollowPattern,
  clearApiError,
} from '../../store/actions';
import { AutoFollowPatternEdit as AutoFollowPatternEditView } from './auto_follow_pattern_edit';

const scope = SECTIONS.AUTO_FOLLOW_PATTERN;

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
  autoFollowPatternId: getSelectedAutoFollowPatternId('edit')(state),
  autoFollowPattern: getSelectedAutoFollowPattern('edit')(state),
});

export const mapDispatchToProps = (dispatch: CcrDispatch) => ({
  getAutoFollowPattern: (id: string) => dispatch(getAutoFollowPattern(id)),
  selectAutoFollowPattern: (id: string | null) => dispatch(selectEditAutoFollowPattern(id)),
  updateAutoFollowPattern: (id: string, autoFollowPattern: AutoFollowPatternConfig) => {
    // Only forward the fields accepted by the update route's body schema
    // (`schema.object({...}).unknowns: 'forbid'` by default). Upstream sources
    // of `autoFollowPattern` (selectors, reducers) may include extra fields
    // such as `name` or `errors`; forwarding those would produce a 400 at the
    // server boundary.
    const { active, remoteCluster, leaderIndexPatterns, followIndexPattern } = autoFollowPattern;
    const updatePayload: AutoFollowPatternConfig = {
      active,
      remoteCluster,
      leaderIndexPatterns,
      followIndexPattern,
    };
    return dispatch(updateAutoFollowPattern(id, updatePayload));
  },
  clearApiError: () => {
    dispatch(clearApiError(`${scope}-get`));
    dispatch(clearApiError(`${scope}-save`));
  },
});

export const AutoFollowPatternEdit = connect(
  mapStateToProps,
  mapDispatchToProps
)(AutoFollowPatternEditView);
