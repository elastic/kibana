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
      type: 'UPDATE_TITLE';
      title: string;
    }
  | {
      type: 'UPDATE_DATASOURCE_STATE';
      updater: unknown | ((prevState: unknown) => unknown);
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
    }
  | {
      type: 'SWITCH_VISUALIZATION';
      newVisualizationId: string;
      initialState: unknown;
      datasourceState: unknown;
      datasourceId: string;
    }
  | {
      type: 'SWITCH_DATASOURCE';
      newDatasourceId: string;
    };

export function getActiveDatasourceIdFromDoc(doc?: Document) {
  if (!doc) {
    return null;
  }

  const [initialDatasourceId] = Object.keys(doc.state.datasourceStates);
  return initialDatasourceId || null;
}

function getInitialDatasourceId(props: EditorFrameProps) {
  return props.initialDatasourceId
    ? props.initialDatasourceId
    : getActiveDatasourceIdFromDoc(props.doc);
}

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
    title: i18n.translate('xpack.lens.chartTitle', { defaultMessage: 'New visualization' }),
    datasourceStates,
    activeDatasourceId: getInitialDatasourceId(props),
    visualization: {
      state: null,
      activeId: props.initialVisualizationId,
    },
  };
};

export const reducer = (state: EditorFrameState, action: Action): EditorFrameState => {
  switch (action.type) {
    case 'RESET':
      return action.state;
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
        activeDatasourceId: getActiveDatasourceIdFromDoc(action.doc),
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
          'datasourceId' in action && action.datasourceId
            ? {
                ...state.datasourceStates,
                [action.datasourceId]: {
                  ...state.datasourceStates[action.datasourceId],
                  state: action.datasourceState,
                },
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
            state:
              typeof action.updater === 'function'
                ? action.updater(state.datasourceStates[action.datasourceId].state)
                : action.updater,
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
