/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { ToolbarOverlay } from './toolbar_overlay';
import { getUniqueIndexPatternIds } from '../../selectors/map_selectors';
import { getIsFilterable } from '../../selectors/ui_selectors';

function mapStateToProps(state = {}) {
  return {
    isFilterable: getIsFilterable(state),
    uniqueIndexPatternIds: getUniqueIndexPatternIds(state)
  };
}

const connectedToolbarOverlay = connect(mapStateToProps, null)(ToolbarOverlay);
export { connectedToolbarOverlay as ToolbarOverlay };
