/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { AppState } from '../../../state';
import { selectIndexPattern } from '../../../state/selectors';
import { getIndexPattern } from '../../../state/actions';
import { KueryBarComponent } from '../../functional';

const mapStateToProps = (state: AppState) => ({ indexPattern: selectIndexPattern(state) });

const mapDispatchToProps = (dispatch: any) => ({
  loadIndexPattern: () => {
    dispatch(getIndexPattern({}));
  },
});

export const KueryBar = connect(mapStateToProps, mapDispatchToProps)(KueryBarComponent);
