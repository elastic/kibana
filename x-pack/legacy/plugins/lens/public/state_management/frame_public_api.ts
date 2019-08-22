/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { updateDatasourceState, updateLayer, removeDatasourceLayers } from './actions';
import { AppState, Datasource, DatasourcePublicAPI, FramePublicAPI, SetState } from '../types';
import { generateId } from '../id_generator';

export interface Props {
  state: AppState;
  setState: SetState;
  datasourceMap: Record<string, Datasource>;
}

export function getFramePublicAPI(props: Props): FramePublicAPI {
  const { state, setState } = props;

  const datasourceLayers = Object.keys(props.datasourceMap)
    .filter(id => state.datasourceStates[id] && !state.datasourceStates[id].isLoading)
    .reduce(
      (acc, id) => {
        const datasourceState = state.datasourceStates[id].state;
        const datasource = props.datasourceMap[id];
        const updater = (newState: unknown) => updateDatasourceState(setState, newState, id);

        datasource.getLayers(datasourceState).forEach(layerId => {
          acc[layerId] = datasource.getPublicAPI(datasourceState, updater, layerId);
        });

        return acc;
      },
      {} as Record<string, DatasourcePublicAPI>
    );

  return {
    datasourceLayers,
    addNewLayer() {
      const newLayerId = generateId();

      if (state.activeDatasourceId != null) {
        updateLayer({
          setState,
          datasourceId: state.activeDatasourceId,
          layerId: newLayerId,
          updater: props.datasourceMap[state.activeDatasourceId!].insertLayer,
        });
      }

      return newLayerId;
    },
    dateRange: state.dateRange,
    query: state.query,
    removeLayers(layerIds: string[]) {
      removeDatasourceLayers(setState, props.datasourceMap, layerIds);
    },
  };
}
