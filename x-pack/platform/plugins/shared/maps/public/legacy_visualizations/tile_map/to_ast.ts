/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/public';
import { VisToExpressionAst } from '@kbn/visualizations-plugin/public';
import { TileMapExpressionFunctionDefinition } from './tile_map_fn';
import { TileMapVisParams } from './types';
import { extractLayerDescriptorParams } from './utils';

export const toExpressionAst: VisToExpressionAst<TileMapVisParams> = (vis) => {
  const tileMap = buildExpressionFunction<TileMapExpressionFunctionDefinition>('tilemap', {
    visConfig: JSON.stringify({
      ...vis.params,
      mapCenter: vis.uiState.get('mapCenter', [0, 0]),
      mapZoom: parseInt(vis.uiState.get('mapZoom', 2), 10),
      layerDescriptorParams: extractLayerDescriptorParams(vis),
    }),
  });

  const ast = buildExpression([tileMap]);

  return ast.toAst();
};
