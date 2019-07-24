/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { toExpression } from '@kbn/interpreter/target/common';
import { Action, EditorFrameState } from './state_management';
import { Document } from '../../persistence/saved_object_store';
import { buildExpression } from './expression_helpers';
import { Datasource, Visualization, FramePublicAPI } from '../../types';

export interface Props {
  activeDatasources: Record<string, Datasource>;
  dispatch: (value: Action) => void;
  redirectTo: (path: string) => void;
  state: EditorFrameState;
  store: { save: (doc: Document) => Promise<{ id: string }> };
  visualization: Visualization;
  framePublicAPI: FramePublicAPI;
  activeDatasourceId: string;
}

export async function save({
  activeDatasources,
  dispatch,
  redirectTo,
  state,
  store,
  visualization,
  framePublicAPI,
  activeDatasourceId,
}: Props) {
  try {
    dispatch({ type: 'SAVING', isSaving: true });

    const expression = buildExpression({
      visualization,
      visualizationState: state.visualization.state,
      datasourceMap: activeDatasources,
      datasourceStates: state.datasourceStates,
      framePublicAPI,
    });

    const datasourceStates: Record<string, unknown> = {};
    Object.entries(activeDatasources).forEach(([id, datasource]) => {
      datasourceStates[id] = datasource.getPersistableState(state.datasourceStates[id].state);
    });

    const filterableIndexPatterns: string[] = [];
    Object.entries(activeDatasources).forEach(([id, datasource]) => {
      filterableIndexPatterns.push(
        ...datasource.getMetaData(state.datasourceStates[id].state).filterableIndexPatterns
      );
    });

    const doc = await store.save({
      id: state.persistedId,
      title: state.title,
      type: 'lens',
      visualizationType: state.visualization.activeId,
      expression: expression ? toExpression(expression) : '',
      activeDatasourceId,
      state: {
        datasourceStates,
        datasourceMetaData: {
          filterableIndexPatterns: _.uniq(filterableIndexPatterns),
        },
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
