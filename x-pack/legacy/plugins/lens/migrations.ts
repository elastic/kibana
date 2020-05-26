/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import { SimpleSavedObject } from 'src/core/public';

export interface RawLensSavedXYObject770 {
  type: 'lens';
  attributes: Record<string, unknown> & {
    visualizationType: string;
    state: Record<string, unknown> & {
      datasourceStates?: Record<string, unknown> & {
        indexpattern?: Record<string, unknown> & {
          layers: Record<string, Record<string, unknown> & { columns: Record<string, unknown> }>;
        };
      };
      visualization: Record<string, unknown> & {
        layers: Array<
          Record<string, unknown> & {
            layerId: string;
            accessors: string[];
            xAccessor: string;
            splitAccessor: string;
          }
        >;
      };
    };
  };
}

type LensSavedXYObjectPost770 = RawLensSavedXYObject770;

function isLensSavedXY770(
  doc: SimpleSavedObject | RawLensSavedXYObject770
): doc is RawLensSavedXYObject770 {
  return (
    doc.type === 'lens' &&
    doc.attributes &&
    (doc.attributes as Record<string, string>).visualizationType === 'lnsXY'
  );
}

export const migrations = {
  '7.7.0': (
    doc: SimpleSavedObject | RawLensSavedXYObject770
  ): SimpleSavedObject | LensSavedXYObjectPost770 => {
    const newDoc = cloneDeep(doc);
    if (!isLensSavedXY770(newDoc)) {
      return newDoc;
    }
    const datasourceState = newDoc.attributes.state?.datasourceStates?.indexpattern;
    const datasourceLayers = datasourceState?.layers ?? {};
    const xyState = newDoc.attributes.state?.visualization;
    newDoc.attributes.state.visualization.layers = xyState.layers.map((layer) => {
      const layerId = layer.layerId;
      const datasource = datasourceLayers[layerId];
      return {
        ...layer,
        xAccessor: datasource?.columns[layer.xAccessor] ? layer.xAccessor : undefined,
        splitAccessor: datasource?.columns[layer.splitAccessor] ? layer.splitAccessor : undefined,
        accessors: layer.accessors.filter((accessor) => !!datasource?.columns[accessor]),
      };
    }) as typeof xyState.layers;
    return newDoc;
  },
};
