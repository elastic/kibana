/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { AppState } from '../../../state';
import { selectIndexPattern } from '../../../state/selectors';
import { AlertMonitorStatusComponent } from '../../functional';

interface OwnProps {
  autocomplete: any;
}

const mapStateToProps = (state: AppState) => ({
  filters: state.ui.esKuery,

  locations: state.overviewFilters.filters.locations,
  indexPattern: selectIndexPattern(state),
});

export const AlertMonitorStatus = connect<typeof mapStateToProps, {}, OwnProps, AppState>(
  mapStateToProps
)(AlertMonitorStatusComponent);
