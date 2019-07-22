/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast, fromExpression } from '@kbn/interpreter/common';
import { TimeRange } from 'ui/timefilter/time_history';
import { Query } from 'src/legacy/core_plugins/data/public';
import { Filter } from '@kbn/es-query';
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

export function prependKibanaContext(
  expression: Ast | string | null,
  {
    timeRange,
    query,
    filters,
  }: {
    timeRange?: TimeRange;
    query?: Query;
    filters?: Filter[];
  }
): Ast | null {
  if (!expression) return null;
  const parsedExpression = typeof expression === 'string' ? fromExpression(expression) : expression;

  return {
    type: 'expression',
    chain: [
      { type: 'function', function: 'kibana', arguments: {} },
      {
        type: 'function',
        function: 'kibana_context',
        arguments: {
          timeRange: timeRange ? [JSON.stringify(timeRange)] : [],
          query: query ? [JSON.stringify(query)] : [],
          filters: filters ? [JSON.stringify(filters)] : [],
        },
      },
      ...parsedExpression.chain,
    ],
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

  return prependKibanaContext(
    prependDatasourceExpression(visualizationExpression, datasource, datasourceState),
    // TODO pass in context from query/filter bar here
    {}
  );
}
