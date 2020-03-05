/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { OverviewPageComponent } from '../../../pages/overview';
import { selectIndexPattern } from '../../../state/selectors';
import { AppState } from '../../../state';
import { setEsKueryString } from '../../../state/actions';

interface DispatchProps {
  setEsKueryFilters: typeof setEsKueryString;
}

const mapDispatchToProps = (dispatch: any): DispatchProps => ({
  setEsKueryFilters: (esFilters: string) => dispatch(setEsKueryString(esFilters)),
});

const mapStateToProps = (state: AppState) => ({ indexPattern: selectIndexPattern(state) });

export const OverviewPage = connect(mapStateToProps, mapDispatchToProps)(OverviewPageComponent);
