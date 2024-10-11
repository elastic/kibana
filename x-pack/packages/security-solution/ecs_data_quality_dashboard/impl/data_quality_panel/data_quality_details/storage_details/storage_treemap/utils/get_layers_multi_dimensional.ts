/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ArrayNode, Datum, Key } from '@elastic/charts';

import { FlattenedBucket } from '../../types';
import { getFillColor } from './get_fill_color';

const groupByRollup = (d: Datum) => d.pattern; // the treemap is grouped by this field

/**
 * Extracts the first group name from the data representing the second group
 */
export const getGroupFromPath = (path: ArrayNode['path']): string | undefined => {
  const OFFSET_FROM_END = 2; // The offset from the end of the path array containing the group
  const groupIndex = path.length - OFFSET_FROM_END;
  return groupIndex > 0 ? path[groupIndex].value : undefined;
};

export const getLayersMultiDimensional = ({
  valueFormatter,
  layer0FillColor,
  pathToFlattenedBucketMap,
}: {
  valueFormatter: (value: number) => string;
  layer0FillColor: string;
  pathToFlattenedBucketMap: Record<string, FlattenedBucket | undefined>;
}) => {
  return [
    {
      fillLabel: {
        valueFormatter,
      },
      groupByRollup,
      nodeLabel: (ilmPhase: Datum) => ilmPhase,
      shape: {
        fillColor: layer0FillColor,
      },
    },
    {
      fillLabel: {
        valueFormatter,
      },
      groupByRollup: (d: Datum) => d.indexName,
      nodeLabel: (indexName: Datum) => indexName,
      shape: {
        fillColor: (indexName: Key, _sortIndex: number, node: Pick<ArrayNode, 'path'>) => {
          const pattern = getGroupFromPath(node.path) ?? '';
          const flattenedBucket = pathToFlattenedBucketMap[`${pattern}${indexName}`];

          return getFillColor(flattenedBucket?.incompatible);
        },
      },
    },
  ];
};
