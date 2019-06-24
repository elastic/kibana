/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action, EditorFrameState } from './state_management';
import { Document } from '../../persistence/saved_object_store';

export async function save({
  datasource,
  dispatch,
  redirectTo,
  state,
  store,
  visualization,
}: {
  datasource?: { getPersistableState: (state: unknown) => unknown };
  dispatch: (value: Action) => void;
  redirectTo: (path: string) => void;
  state: EditorFrameState;
  store: { save: (doc: Document) => Promise<{ id: string }> };
  visualization?: { getPersistableState: (state: unknown) => unknown };
}) {
  dispatch({ type: 'SAVING' });

  // TODO: error handling
  const doc = await store.save({
    id: state.persistedId,
    title: state.title,
    type: 'lens',
    visualizationType: state.visualization.activeId || 'unknown',
    datasourceType: state.datasource.activeId || 'unknown',
    state: {
      datasource: datasource && datasource.getPersistableState(state.datasource.state),
      visualization: visualization && visualization.getPersistableState(state.visualization.state),
    },
  });

  if (doc.id !== state.persistedId) {
    dispatch({ type: 'UPDATE_PERSISTED_ID', id: doc.id });
    redirectTo(`/edit/${doc.id}`);
  }

  dispatch({ type: 'SAVED' });
}
