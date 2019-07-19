/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action, EditorFrameState } from './state_management';
import { Document } from '../../persistence/saved_object_store';

export interface Props {
  // datasource: { getPersistableState: (state: unknown) => unknown };
  activeDatasources: Record<string, { getPersistableState: (state: unknown) => unknown }>;
  dispatch: (value: Action) => void;
  redirectTo: (path: string) => void;
  state: EditorFrameState;
  store: { save: (doc: Document) => Promise<{ id: string }> };
  visualization: { getPersistableState: (state: unknown) => unknown };
}

export async function save({
  activeDatasources,
  dispatch,
  redirectTo,
  state,
  store,
  visualization,
}: Props) {
  try {
    dispatch({ type: 'SAVING', isSaving: true });

    const datasourceStates: Record<string, unknown> = {};
    Object.entries(activeDatasources).forEach(([id, datasource]) => {
      datasourceStates[id] = datasource.getPersistableState(state.datasourceStates[id].state);
    });

    const doc = await store.save({
      id: state.persistedId,
      title: state.title,
      type: 'lens',
      visualizationType: state.visualization.activeId,
      activeDatasourceId: state.activeDatasourceId!,
      state: {
        datasourceStates,
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
