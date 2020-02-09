/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { SourceEditor } from './view';
import { getInspectorAdapters } from '../../../reducers/non_serializable_instances';

function mapStateToProps(state = {}) {
  return {
    inspectorAdapters: getInspectorAdapters(state),
  };
}

const connectedFlyOut = connect(mapStateToProps)(SourceEditor);
export { connectedFlyOut as SourceEditor };
