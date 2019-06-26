/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { connect } from 'react-redux';
import { ImportEditor } from './view';
import { getInspectorAdapters } from '../../../store/non_serializable_instances';
import { INDEXING_STAGE, updateIndexingStage, getIndexingStage } from '../../../store/ui';

function mapStateToProps(state = {}) {
  return {
    inspectorAdapters: getInspectorAdapters(state),
    isIndexingTriggered: getIndexingStage(state) === INDEXING_STAGE.TRIGGERED,
  };
}

const mapDispatchToProps = {
  onIndexReady: indexReady => indexReady
    ? updateIndexingStage(INDEXING_STAGE.READY)
    : updateIndexingStage(null),
  importSuccessHandler: () => updateIndexingStage(INDEXING_STAGE.SUCCESS),
  importErrorHandler: () => updateIndexingStage(INDEXING_STAGE.ERROR),
};

const connectedFlyOut = connect(mapStateToProps, mapDispatchToProps)(ImportEditor);
export { connectedFlyOut as ImportEditor };

