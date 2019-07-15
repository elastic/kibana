/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action, EditorFrameState } from './state_management';
import { Document } from '../../persistence/saved_object_store';

export interface Props {
  datasource: { getPersistableState: (state: unknown) => unknown };
  dispatch: (value: Action) => void;
  redirectTo: (path: string) => void;
  state: EditorFrameState;
  store: { save: (doc: Document) => Promise<{ id: string }> };
  visualization: { getPersistableState: (state: unknown) => unknown };
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

    const doc = await store.save({
      id: state.persistedId,
      title: state.title,
      type: 'lens',
      visualizationType: state.visualization.activeId,
      // datasourceType: state.datasource.activeId,
      datasourceType: state.activeDatasourceId,
      state: {
        datasource: datasource.getPersistableState(state.datasource.state),
        // datasources: datasource.getPersistableState(state.datasource.state),
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
