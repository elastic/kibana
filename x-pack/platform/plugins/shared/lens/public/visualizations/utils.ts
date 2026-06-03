/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getColumnByAccessor } from '@kbn/chart-expressions-common';
import type { VisualizationConfigProps } from '@kbn/lens-common';

export function getColumnFromActiveData({
  accessor,
  layerId,
  activeData,
}: {
  accessor: string | undefined;
  layerId: string;
  activeData: VisualizationConfigProps['frame']['activeData'];
}) {
  const columns = activeData?.[layerId]?.columns ?? activeData?.default?.columns;

  if (!accessor || !columns) {
    return undefined;
  }

  return getColumnByAccessor(accessor, columns);
}
