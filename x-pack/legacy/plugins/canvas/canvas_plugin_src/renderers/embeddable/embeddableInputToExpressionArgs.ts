/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EmbeddableTypes } from '../../expression_types';
import { SavedMapInput } from '../../functions/common/saved_map';
import { SearchInput } from '../../../../../../../src/legacy/core_plugins/kibana/public/discover/embeddable';
import { VisualizeInput } from '../../functions/common/saved_visualization';
import { CanvasFunctionName } from '../../../types';
export type EmbeddableInputType = SavedMapInput | SearchInput | VisualizeInput;

type AllowableTypes = string | number | boolean | null | undefined;
type ObjectType = { fn: string } & { [key: string]: AllowableTypes | AllowableTypes[] };

type ReturnType = {
  [key in CanvasFunctionName]?: {
    [key: string]: AllowableTypes | AllowableTypes[] | ObjectType | ObjectType[];
  };
};

/*
  This function defines which values from an embeddablesInput
  should be carried forward into the expression as they change

  If the value of the arg should be an expression, then use an object
  with a key of fn with the name of the function, and the rest of the
  entries as argument name / argument value
*/
export function EmbeddableInputToExpressionArgs(
  input: EmbeddableInputType,
  embeddableType: string
): ReturnType {
  const expressionArgs: ReturnType = {};

  if (embeddableType === EmbeddableTypes.map) {
    const mapInput = input as SavedMapInput;
    const mapArgs = {
      showLayersMenu: mapInput.isLayerTOCOpen,
      center: mapInput.mapCenter ? { fn: 'mapCenter', ...mapInput.mapCenter } : undefined,
      title: input.title,
    };

    expressionArgs.savedMap = mapArgs;
  }

  if (embeddableType === EmbeddableTypes.search) {
    const searchInput = input as SearchInput;
    const searchArgs = {
      columns: searchInput.columns,
      sort: searchInput.sort
        ? searchInput.sort.map(s => ({
            column: s[0],
            direction: s[1],
            fn: 'searchSort',
          }))
        : undefined,
      title: input.title,
    };

    expressionArgs.savedSearch = searchArgs;
  }

  if (embeddableType === EmbeddableTypes.visualization) {
    expressionArgs.savedVisualization = {
      title: input.title,
    };
  }

  return expressionArgs;
}
