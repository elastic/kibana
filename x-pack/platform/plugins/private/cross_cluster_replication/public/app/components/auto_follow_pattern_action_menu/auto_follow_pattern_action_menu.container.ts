/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import type { Props } from './auto_follow_pattern_action_menu';
import { AutoFollowPatternActionMenu as AutoFollowPatternActionMenuView } from './auto_follow_pattern_action_menu';
import type { CcrState } from '../../store';

import { pauseAutoFollowPattern, resumeAutoFollowPattern } from '../../store/actions';

type OwnProps = Pick<Props, 'edit' | 'patterns' | 'arrowDirection'>;
type DispatchProps = Pick<Props, 'pauseAutoFollowPattern' | 'resumeAutoFollowPattern'>;
type CcrDispatch = ThunkDispatch<CcrState, undefined, AnyAction>;

const mapDispatchToProps = (dispatch: CcrDispatch): DispatchProps => ({
  pauseAutoFollowPattern: (ids: string[]) => {
    dispatch(pauseAutoFollowPattern(ids));
  },
  resumeAutoFollowPattern: (ids: string[]) => {
    dispatch(resumeAutoFollowPattern(ids));
  },
});

export const AutoFollowPatternActionMenu = connect<{}, DispatchProps, OwnProps, CcrState>(
  null,
  mapDispatchToProps
)(AutoFollowPatternActionMenuView);
