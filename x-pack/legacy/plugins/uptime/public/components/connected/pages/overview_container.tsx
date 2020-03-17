/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { selectIndexPattern } from '../../../state/selectors';
import { AppState } from '../../../state';
import { setEsKueryString } from '../../../state/actions';
import { OverviewPageComponent } from '../../../pages/overview';

interface DispatchProps {
  setEsKueryFilters: typeof setEsKueryString;
}

const mapDispatchToProps = (dispatch: any): DispatchProps => ({
  setEsKueryFilters: (esFilters: string) => dispatch(setEsKueryString(esFilters)),
});

const mapStateToProps = (state: AppState) => ({ ...selectIndexPattern(state) });

export const OverviewPage = connect(mapStateToProps, mapDispatchToProps)(OverviewPageComponent);
