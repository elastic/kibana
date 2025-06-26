/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { FlyoutBody } from './flyout_body';
import { MapStoreState } from '../../../reducers/store';
import { getMapColors, getMostCommonDataViewId } from '../../../selectors/map_selectors';

function mapStateToProps(state: MapStoreState) {
  return {
    mapColors: getMapColors(state),
    mostCommonDataViewId: getMostCommonDataViewId(state),
  };
}

const connected = connect(mapStateToProps, {})(FlyoutBody);
export { connected as FlyoutBody };
