/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { MapStoreState } from '../../../../../../reducers/store';
import { getMapZoom, isUsingSearch } from '../../../../../../selectors/map_selectors';
import { getInspectorAdapters } from '../../../../../../reducers/non_serializable_instances';
import { TOCEntryButton, ReduxStateProps, OwnProps } from './toc_entry_button';

function mapStateToProps(state: MapStoreState, ownProps: OwnProps): ReduxStateProps {
  return {
    inspectorAdapters: getInspectorAdapters(state),
    isUsingSearch: isUsingSearch(state),
    zoom: getMapZoom(state),
  };
}

const connected = connect<ReduxStateProps, {}, OwnProps, MapStoreState>(mapStateToProps)(
  TOCEntryButton
);
export { connected as TOCEntryButton };
