/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { SourceDetails } from './source_details';
import { getDataFilters } from '../../../selectors/map_selectors';
import { MapStoreState } from '../../../reducers/store';

function mapStateToProps(state: MapStoreState) {
  return {
    dataFilters: getDataFilters(state),
  };
}

const connected = connect(mapStateToProps, {})(SourceDetails);
export { connected as SourceDetails };
