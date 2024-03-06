/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataView } from '@kbn/data-views-plugin/public';
import type {
  LensConfig,
  LensConfigOptions,
} from '@kbn/lens-embeddable-utils/config_builder/types';

export const getConfigOptions = (dataView: DataView, isESQL?: boolean) => {
  const index = dataView.getIndexPattern();
  const timeFieldName = dataView.getTimeField()?.name;
  if (isESQL) {
    return {
      config: {
        chartType: 'metric',
        title: 'metric chart',
        dataset: {
          esql: `from ${index} | stats count=count()`,
        },
        value: 'count',
      } as LensConfig,
      options: {
        embeddable: true,
        timeRange: {
          from: 'now-30d',
          to: 'now',
          type: 'relative',
        },
        query: {
          esql: `from ${index} | stats count=count()`,
        },
      } as unknown as LensConfigOptions,
    };
  } else {
    return {
      config: {
        chartType: 'heatmap',
        title: 'heatmap chart',
        dataset: {
          index,
          timeFieldName,
        },
        xAxis: {
          type: 'dateHistogram',
          field: timeFieldName,
        },
        value: 'count()',
      } as LensConfig,
      options: {
        embeddable: true,
        timeRange: {
          from: 'now-30d',
          to: 'now',
          type: 'relative',
        },
      } as LensConfigOptions,
    };
  }
};
