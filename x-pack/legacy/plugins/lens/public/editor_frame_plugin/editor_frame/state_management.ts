/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { EditorFrameProps } from '../editor_frame';
import { Document } from '../../persistence/saved_object_store';

export interface EditorFrameState {
  persistedId?: string;
  saving: boolean;
  title: string;
  visualization: {
    activeId: string | null;
    state: unknown;
  };
  datasourceStates: Record<string, { state: unknown; isLoading: boolean }>;
  activeDatasourceId: string | null;
}

export type Action =
  | {
      type: 'RESET';
      state: EditorFrameState;
    }
  | {
      type: 'SAVING';
      isSaving: boolean;
    }
  | {
      type: 'UPDATE_TITLE';
      title: string;
    }
  | {
      type: 'UPDATE_PERSISTED_ID';
      id: string;
    }
  | {
      type: 'UPDATE_DATASOURCE_STATE';
      newState: unknown;
      datasourceId: string;
    }
  | {
      type: 'UPDATE_VISUALIZATION_STATE';
      newState: unknown;
    }
  | {
      type: 'UPDATE_LAYER';
      layerId: string;
      datasourceId: string;
      updater: (state: unknown, layerId: string) => unknown;
    }
  | {
      type: 'VISUALIZATION_LOADED';
      doc: Document;
    }
  | {
      type: 'SWITCH_VISUALIZATION';
      newVisualizationId: string;
      initialState: unknown;
      datasourceState?: unknown;
    }
  | {
      type: 'SWITCH_DATASOURCE';
      newDatasourceId: string;
    };

export const getInitialState = (props: EditorFrameProps): EditorFrameState => {
  const datasourceStates: EditorFrameState['datasourceStates'] = {};

  if (props.doc) {
    Object.entries(props.doc.state.datasourceStates).forEach(([datasourceId, state]) => {
      datasourceStates[datasourceId] = { isLoading: true, state };
    });
  } else if (props.initialDatasourceId) {
    datasourceStates[props.initialDatasourceId] = {
      state: null,
      isLoading: true,
    };
  }

  return {
    saving: false,
    title: i18n.translate('xpack.lens.chartTitle', { defaultMessage: 'New visualization' }),
    datasourceStates,
    activeDatasourceId: props.initialDatasourceId ? props.initialDatasourceId : null,
    visualization: {
      state: null,
      activeId: props.initialVisualizationId,
    },
  };
};

export const reducer = (state: EditorFrameState, action: Action): EditorFrameState => {
  switch (action.type) {
    case 'SAVING':
      return { ...state, saving: action.isSaving };
    case 'RESET':
      return action.state;
    case 'UPDATE_PERSISTED_ID':
      return { ...state, persistedId: action.id };
    case 'UPDATE_TITLE':
      return { ...state, title: action.title };
    case 'UPDATE_LAYER':
      return {
        ...state,
        datasourceStates: {
          ...state.datasourceStates,
          [action.datasourceId]: {
            ...state.datasourceStates[action.datasourceId],
            state: action.updater(
              state.datasourceStates[action.datasourceId].state,
              action.layerId
            ),
          },
        },
      };
    case 'VISUALIZATION_LOADED':
      return {
        ...state,
        persistedId: action.doc.id,
        title: action.doc.title,
        datasourceStates: Object.entries(action.doc.state.datasourceStates).reduce(
          (stateMap, [datasourceId, datasourceState]) => ({
            ...stateMap,
            [datasourceId]: {
              isLoading: true,
              state: datasourceState,
            },
          }),
          {}
        ),
        activeDatasourceId: action.doc.activeDatasourceId,
        visualization: {
          ...state.visualization,
          activeId: action.doc.visualizationType,
          state: action.doc.state.visualization,
        },
      };
    case 'SWITCH_DATASOURCE':
      return {
        ...state,
        datasourceStates: {
          ...state.datasourceStates,
          [action.newDatasourceId]: state.datasourceStates[action.newDatasourceId] || {
            state: null,
            isLoading: true,
          },
        },
        activeDatasourceId: action.newDatasourceId,
      };
    case 'SWITCH_VISUALIZATION':
      return {
        ...state,
        datasourceStates:
          state.activeDatasourceId && action.datasourceState
            ? {
                ...state.datasourceStates,
                [state.activeDatasourceId]: { state: action.datasourceState, isLoading: false },
              }
            : state.datasourceStates,
        visualization: {
          ...state.visualization,
          activeId: action.newVisualizationId,
          state: action.initialState,
        },
      };
    case 'UPDATE_DATASOURCE_STATE':
      return {
        ...state,
        datasourceStates: {
          ...state.datasourceStates,
          [action.datasourceId]: {
            state: action.newState,
            isLoading: false,
          },
        },
      };
    case 'UPDATE_VISUALIZATION_STATE':
      if (!state.visualization.activeId) {
        throw new Error('Invariant: visualization state got updated without active visualization');
      }
      return {
        ...state,
        visualization: {
          ...state.visualization,
          state: action.newState,
        },
      };
    default:
      return state;
  }
};
