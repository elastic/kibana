/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast, fromExpression } from '@kbn/interpreter/common';
import { Visualization, Datasource, DatasourcePublicAPI } from '../../types';

export function prependDatasourceExpression(
  visualizationExpression: Ast | string | null,
  datasource: Datasource,
  datasourceState: unknown
): Ast | null {
  const datasourceExpression = datasource.toExpression(datasourceState);

  if (datasourceExpression === null || visualizationExpression === null) {
    return null;
  }

  const parsedDatasourceExpression =
    typeof datasourceExpression === 'string'
      ? fromExpression(datasourceExpression)
      : datasourceExpression;
  const parsedVisualizationExpression =
    typeof visualizationExpression === 'string'
      ? fromExpression(visualizationExpression)
      : visualizationExpression;
  return {
    type: 'expression',
    chain: [...parsedDatasourceExpression.chain, ...parsedVisualizationExpression.chain],
  };
}

export function buildExpression(
  visualization: Visualization | null,
  visualizationState: unknown,
  datasource: Datasource,
  datasourceState: unknown,
  datasourcePublicAPI: DatasourcePublicAPI
): Ast | null {
  if (visualization === null) {
    return null;
  }
  const visualizationExpression = visualization.toExpression(
    visualizationState,
    datasourcePublicAPI
  );

  return prependDatasourceExpression(visualizationExpression, datasource, datasourceState);
}
