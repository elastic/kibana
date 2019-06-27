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
  datasource: {
    activeId: string | null;
    state: unknown;
    isLoading: boolean;
  };
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
    }
  | {
      type: 'UPDATE_VISUALIZATION_STATE';
      newState: unknown;
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
  return {
    saving: false,
    title: i18n.translate('xpack.lens.chartTitle', { defaultMessage: 'Untitled chart' }),
    datasource: {
      state: null,
      isLoading: Boolean(props.initialDatasourceId),
      activeId: props.initialDatasourceId,
    },
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
    case 'VISUALIZATION_LOADED':
      return {
        ...state,
        persistedId: action.doc.id,
        title: action.doc.title,
        datasource: {
          ...state.datasource,
          activeId: action.doc.datasourceType || null,
          isLoading: true,
          state: action.doc.state.datasource,
        },
        visualization: {
          ...state.visualization,
          activeId: action.doc.visualizationType,
          state: action.doc.state.visualization,
        },
      };
    case 'SWITCH_DATASOURCE':
      return {
        ...state,
        datasource: {
          ...state.datasource,
          isLoading: true,
          state: null,
          activeId: action.newDatasourceId,
        },
        visualization: {
          ...state.visualization,
          // purge visualization on datasource switch
          state: null,
          activeId: null,
        },
      };
    case 'SWITCH_VISUALIZATION':
      return {
        ...state,
        visualization: {
          ...state.visualization,
          activeId: action.newVisualizationId,
          state: action.initialState,
        },
        datasource: {
          ...state.datasource,
          state: action.datasourceState ? action.datasourceState : state.datasource.state,
        },
      };
    case 'UPDATE_DATASOURCE_STATE':
      return {
        ...state,
        datasource: {
          ...state.datasource,
          // when the datasource state is updated, the initialization is complete
          isLoading: false,
          state: action.newState,
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
