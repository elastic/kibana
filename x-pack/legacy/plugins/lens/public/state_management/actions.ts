/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import { toExpression } from '@kbn/interpreter/target/common';
import { Datasource, Visualization, AppState, FramePublicAPI, SetState } from '../types';
import { SavedObjectStore } from '../persistence';
import { generateId } from '../id_generator';
import { buildExpression } from './expression_helpers';

interface InitializationOpts {
  datasourceMap: Record<string, Datasource>;
  visualizationMap: Record<string, Visualization>;
  language: string;
  dateRange: {
    fromDate: string;
    toDate: string;
  };
}

interface LoadOpts extends InitializationOpts {
  setState: SetState;
  docId?: string;
  docStorage: SavedObjectStore;
}

async function initializeDatasourceStates(
  datasourceMap: Record<string, Datasource>,
  datasourceStates: Record<string, unknown> = {}
) {
  const datasourceStateList = await Promise.all(
    Object.keys(datasourceMap).map(async datasourceId => ({
      datasourceId,
      datasourceState: await datasourceMap[datasourceId].initialize(datasourceStates[datasourceId]),
    }))
  );

  return datasourceStateList.reduce(
    (acc, { datasourceId, datasourceState }) => {
      acc[datasourceId] = {
        state: datasourceState,
        isLoading: false,
      };
      return acc;
    },
    {} as Record<string, { state: unknown; isLoading: boolean }>
  );
}

export async function newDocument(opts: LoadOpts) {
  const { datasourceMap, visualizationMap, setState } = opts;
  const datasourceStates = await initializeDatasourceStates(datasourceMap);
  const [activeVisualizationId] = Object.keys(visualizationMap);
  const [activeDatasourceId] = Object.keys(datasourceMap);
  const visualization = visualizationMap[activeVisualizationId];
  let activeDatasourceState = datasourceStates[activeDatasourceId].state;
  const generateLayer = () => {
    const layerId = generateId();
    activeDatasourceState = datasourceMap[activeDatasourceId].insertLayer(
      activeDatasourceState,
      layerId
    );
    return layerId;
  };
  const visualizationState = visualization.initialize({
    generateLayerId: generateLayer,
    generateColumnId: generateId,
  });

  setState(state => ({
    ...state,
    isLoading: false,
    visualization: {
      activeId: activeVisualizationId,
      state: visualizationState,
    },
    datasourceStates: {
      ...datasourceStates,
      [activeDatasourceId]: {
        isLoading: false,
        state: activeDatasourceState,
      },
    },
  }));
}

export function initialState(opts: InitializationOpts): AppState {
  const [activeDatasourceId] = Object.keys(opts.datasourceMap);
  const [activeVisualizationId] = Object.keys(opts.visualizationMap);

  return {
    isLoading: true,
    title: i18n.translate('xpack.lens.chartTitle', { defaultMessage: 'New visualization' }),
    datasourceStates: {},
    activeDatasourceId,
    visualization: {
      state: null,
      activeId: activeVisualizationId,
    },
    query: { query: '', language: opts.language },
    language: opts.language,
    dateRange: opts.dateRange,
  };
}

async function loadDocument(opts: LoadOpts) {
  const { datasourceMap, docStorage, docId, setState } = opts;
  const doc = await docStorage.load(docId!);
  const datasourceStates = await initializeDatasourceStates(
    datasourceMap,
    doc.state.datasourceStates
  );
  const [activeDatasourceId] = Object.keys(doc.state.datasourceStates);

  setState(state => ({
    ...state,
    doc,
    activeDatasourceId,
    datasourceStates,
    persistedId: doc.id,
    title: doc.title,
    query: doc.state.query,
    visualization: {
      activeId: doc.visualizationType!,
      state: doc.state.visualization,
    },
  }));
}

export async function initialize(opts: LoadOpts) {
  opts.setState(state => ({ ...state, isLoading: true }));

  try {
    if (opts.docId) {
      await loadDocument(opts);
    } else {
      await newDocument(opts);
    }
  } finally {
    opts.setState(state => ({ ...state, isLoading: false }));
  }
}

export function toSavedObject({
  datasourceMap,
  visualizationMap,
  framePublicAPI,
  state,
}: {
  datasourceMap: Record<string, Datasource>;
  visualizationMap: Record<string, Visualization>;
  framePublicAPI: FramePublicAPI;
  state: {
    visualization: {
      activeId: string;
      state: unknown;
    };
    persistedId?: string;
    title: string;
    datasourceStates: Record<string, { state: unknown; isLoading: boolean }>;
  };
}) {
  const visualization = state.visualization.activeId
    ? visualizationMap[state.visualization.activeId]
    : undefined;

  if (!visualization) {
    return;
  }

  const activeDatasources: Record<string, Datasource> = Object.keys(state.datasourceStates).reduce(
    (acc, datasourceId) => ({
      ...acc,
      [datasourceId]: datasourceMap[datasourceId],
    }),
    {}
  );

  const expression = buildExpression({
    visualization,
    visualizationState: state.visualization.state,
    datasourceMap: activeDatasources,
    datasourceStates: state.datasourceStates,
    framePublicAPI,
    removeDateRange: true,
  });

  const datasourceStates: Record<string, unknown> = {};
  const filterableIndexPatterns: Array<{ id: string; title: string }> = [];
  Object.entries(activeDatasources).forEach(([id, datasource]) => {
    datasourceStates[id] = datasource.getPersistableState(state.datasourceStates[id].state);
    filterableIndexPatterns.push(
      ...datasource.getMetaData(state.datasourceStates[id].state).filterableIndexPatterns
    );
  });

  return {
    id: state.persistedId,
    title: state.title,
    type: 'lens',
    visualizationType: state.visualization.activeId,
    expression: expression ? toExpression(expression) : '',
    state: {
      datasourceStates,
      datasourceMetaData: {
        filterableIndexPatterns: _.uniq(filterableIndexPatterns, 'id'),
      },
      visualization: visualization.getPersistableState(state.visualization.state),
      query: framePublicAPI.query,
      filters: [], // TODO: Support filters
    },
  };
}

export function updateVisualizationState(setState: SetState, visualizationState: unknown) {
  setState(state => ({
    ...state,
    visualization: {
      ...state.visualization,
      state: visualizationState,
    },
  }));
}

export function switchVisualization(
  setState: SetState,
  {
    visualizationId,
    visualizationState,
    datasourceId,
    datasourceState,
  }: {
    visualizationId: string;
    visualizationState: unknown;
    datasourceId?: string;
    datasourceState: unknown;
  }
) {
  setState(state => ({
    ...state,
    activeDatasourceId: datasourceId || null,
    datasourceStates:
      datasourceId == null
        ? state.datasourceStates
        : {
            ...state.datasourceStates,
            [datasourceId]: {
              ...state.datasourceStates[datasourceId],
              state: datasourceState,
            },
          },
    visualization: {
      ...state.visualization,
      activeId: visualizationId,
      state: visualizationState,
    },
  }));
}

export function updateDatasourceState(setState: SetState, updater: unknown, datasourceId: string) {
  setState(state => ({
    ...state,
    datasourceStates: {
      ...state.datasourceStates,
      [datasourceId]: {
        state:
          typeof updater === 'function'
            ? updater(state.datasourceStates[datasourceId].state)
            : updater,
        isLoading: false,
      },
    },
  }));
}

export function switchDatasource(setState: SetState, datasourceId: string) {
  setState(state => ({
    ...state,
    datasourceStates: {
      ...state.datasourceStates,
      [datasourceId]: state.datasourceStates[datasourceId] || {
        state: null,
        isLoading: true,
      },
    },
    activeDatasourceId: datasourceId,
  }));
}

export function setTitle(setState: SetState, title: string) {
  setState(state => ({ ...state, title }));
}

export function updateLayer({
  setState,
  datasourceId,
  layerId,
  updater,
}: {
  setState: SetState;
  datasourceId: string;
  layerId: string;
  updater: (state: unknown, layerId: string) => unknown;
}) {
  setState(state => ({
    ...state,
    datasourceStates: {
      ...state.datasourceStates,
      [datasourceId]: {
        ...state.datasourceStates[datasourceId],
        state: updater(state.datasourceStates[datasourceId].state, layerId),
      },
    },
  }));
}

export function removeDatasourceLayers(
  setState: SetState,
  datasourceMap: Record<string, Datasource>,
  layerIds: string[]
) {
  setState(state => {
    const datasourceIds = Object.keys(state.datasourceStates);
    const datasourceStates = datasourceIds.reduce((acc, datasourceId) => {
      const datasource = datasourceMap[datasourceId];
      const layers = datasource.getLayers(acc[datasourceId].state);

      return layerIds.reduce((states, layerId) => {
        if (!layers.includes(layerId)) {
          return states;
        }
        return {
          ...states,
          [datasourceId]: {
            ...states[datasourceId],
            state: datasource.removeLayer(states[datasourceId].state, layerId),
          },
        };
      }, acc);
    }, state.datasourceStates);

    return {
      ...state,
      datasourceStates,
    };
  });
}
