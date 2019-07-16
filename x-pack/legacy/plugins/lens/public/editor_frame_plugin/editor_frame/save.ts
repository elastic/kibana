/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action, EditorFrameState } from './state_management';
import { Document } from '../../persistence/saved_object_store';
import { buildExpression } from './expression_helpers';
import { Datasource, Visualization } from '../../types';

export interface Props {
  datasource: Datasource;
  dispatch: (value: Action) => void;
  redirectTo: (path: string) => void;
  state: EditorFrameState;
  store: { save: (doc: Document) => Promise<{ id: string }> };
  visualization: Visualization;
}

export async function save({
  datasource,
  dispatch,
  redirectTo,
  state,
  store,
  visualization,
}: Props) {
  try {
    dispatch({ type: 'SAVING', isSaving: true });

    const expression = buildExpression(visualization, state.visualization.state, datasource, state.datasource.state, datasource.getPublicAPI(state.datasource.state, () => {}));

    const doc = await store.save({
      id: state.persistedId,
      title: state.title,
      type: 'lens',
      visualizationType: state.visualization.activeId,
      datasourceType: state.datasource.activeId,
      state: {
        datasource: datasource.getPersistableState(state.datasource.state),
        visualization: visualization.getPersistableState(state.visualization.state),
      },
    });

    if (doc.id !== state.persistedId) {
      dispatch({ type: 'UPDATE_PERSISTED_ID', id: doc.id });
      redirectTo(`/edit/${doc.id}`);
    }
  } finally {
    dispatch({ type: 'SAVING', isSaving: false });
  }
}
