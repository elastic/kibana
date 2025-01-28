/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { AttributionControl } from './attribution_control';
import { getLayerList } from '../../../selectors/map_selectors';
import { getIsFullScreen } from '../../../selectors/ui_selectors';
import { MapStoreState } from '../../../reducers/store';

function mapStateToProps(state: MapStoreState) {
  return {
    layerList: getLayerList(state),
    isFullScreen: getIsFullScreen(state),
  };
}

const connected = connect(mapStateToProps, {})(AttributionControl);
export { connected as AttributionControl };
