/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast, fromExpression } from '@kbn/interpreter/common';
import { Visualization, Datasource, FramePublicAPI } from '../../types';

export function prependDatasourceExpression(
  visualizationExpression: Ast | string | null,
  datasourceMap: Record<string, Datasource>,
  datasourceStates: Record<
    string,
    {
      isLoading: boolean;
      state: unknown;
    }
  >
): Ast | null {
  const datasourceExpressions: Array<Ast | string> = [];

  Object.entries(datasourceMap).forEach(([datasourceId, datasource]) => {
    const state = datasourceStates[datasourceId].state;
    const layers = datasource.getLayers(datasourceStates[datasourceId].state);

    layers.forEach(layerId => {
      const result = datasource.toExpression(state, layerId);
      if (result) {
        datasourceExpressions.push(result);
      }
    });
  });

  if (datasourceExpressions.length === 0 || visualizationExpression === null) {
    return null;
  }

  const parsedDatasourceExpressions = datasourceExpressions.map(expr =>
    typeof expr === 'string' ? fromExpression(expr) : expr
  );
  const parsedVisualizationExpression =
    typeof visualizationExpression === 'string'
      ? fromExpression(visualizationExpression)
      : visualizationExpression;

  const chainedExpr = parsedDatasourceExpressions
    .map(expr => expr.chain)
    .reduce((prev, current) => prev.concat(current), []);

  return {
    type: 'expression',
    chain: chainedExpr.concat([...parsedVisualizationExpression.chain]),
  };
}

export function buildExpression({
  visualization,
  visualizationState,
  datasourceMap,
  datasourceStates,
  framePublicAPI,
}: {
  visualization: Visualization | null;
  visualizationState: unknown;
  datasourceMap: Record<string, Datasource>;
  datasourceStates: Record<
    string,
    {
      isLoading: boolean;
      state: unknown;
    }
  >;
  framePublicAPI: FramePublicAPI;
}): Ast | null {
  if (visualization === null) {
    return null;
  }
  const visualizationExpression = visualization.toExpression(visualizationState, framePublicAPI);

  return prependDatasourceExpression(visualizationExpression, datasourceMap, datasourceStates);
}
