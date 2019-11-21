/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { union } from 'lodash';
import {
  InfraBackendFrameworkAdapter,
  InfraFrameworkRequest,
} from '../../../lib/adapters/framework';
import {
  MetricsExplorerColumnType,
  MetricsExplorerRequest,
  MetricsExplorerRow,
  MetricsExplorerSeries,
  MetricsExplorerWrappedRequest,
} from '../types';
import { createMetricModel } from './create_metrics_model';
import { JsonObject } from '../../../../common/typed_json';
import { calculateMetricInterval } from '../../../utils/calculate_metric_interval';

export const populateSeriesWithTSVBData = (
  req: InfraFrameworkRequest<MetricsExplorerWrappedRequest>,
  options: MetricsExplorerRequest,
  framework: InfraBackendFrameworkAdapter
) => async (series: MetricsExplorerSeries) => {
  // IF there are no metrics selected then we should return an empty result.
  if (options.metrics.length === 0) {
    return {
      ...series,
      columns: [],
      rows: [],
    };
  }

  // Set the filter for the group by or match everything
  const filters: JsonObject[] = options.groupBy
    ? [{ match: { [options.groupBy]: series.id } }]
    : [];
  if (options.filterQuery) {
    try {
      const filterQuery = JSON.parse(options.filterQuery);
      filters.push(filterQuery);
    } catch (error) {
      filters.push({
        query_string: {
          query: options.filterQuery,
          analyze_wildcard: true,
        },
      });
    }
  }
  const timerange = { min: options.timerange.from, max: options.timerange.to };

  // Create the TSVB model based on the request options
  const model = createMetricModel(options);
  const calculatedInterval = await calculateMetricInterval(
    framework,
    req,
    {
      indexPattern: options.indexPattern,
      timestampField: options.timerange.field,
      timerange: options.timerange,
    },
    options.metrics
      .filter(metric => metric.field)
      .map(metric => {
        return metric
          .field!.split(/\./)
          .slice(0, 2)
          .join('.');
      })
  );

  if (calculatedInterval) {
    model.interval = `>=${calculatedInterval}s`;
  }

  // Get TSVB results using the model, timerange and filters
  const tsvbResults = await framework.makeTSVBRequest(req, model, timerange, filters);

  // If there is no data `custom` will not exist.
  if (!tsvbResults.custom) {
    return {
      ...series,
      columns: [],
      rows: [],
    };
  }

  // Setup the dynamic columns and row attributes depending on if the user is doing a group by
  // and multiple metrics
  const attributeColumns =
    options.groupBy != null ? [{ name: 'groupBy', type: MetricsExplorerColumnType.string }] : [];
  const metricColumns = options.metrics.map((m, i) => ({
    name: `metric_${i}`,
    type: MetricsExplorerColumnType.number,
  }));
  const rowAttributes = options.groupBy != null ? { groupBy: series.id } : {};

  // To support multiple metrics, there are multiple TSVB series which need to be combined
  // into one MetricExplorerRow (Canvas row). This is done by collecting all the timestamps
  // across each TSVB series. Then for each timestamp we find the values and create a
  // MetricsExplorerRow.
  const timestamps = tsvbResults.custom.series.reduce(
    (currentTimestamps, tsvbSeries) =>
      union(
        currentTimestamps,
        tsvbSeries.data.map(row => row[0])
      ).sort(),
    [] as number[]
  );
  // Combine the TSVB series for multiple metrics.
  const rows = timestamps.map(timestamp => {
    return tsvbResults.custom.series.reduce(
      (currentRow, tsvbSeries) => {
        const matches = tsvbSeries.data.find(d => d[0] === timestamp);
        if (matches) {
          return { ...currentRow, [tsvbSeries.id]: matches[1] };
        }
        return currentRow;
      },
      { timestamp, ...rowAttributes } as MetricsExplorerRow
    );
  });
  return {
    ...series,
    rows,
    columns: [
      { name: 'timestamp', type: MetricsExplorerColumnType.date },
      ...metricColumns,
      ...attributeColumns,
    ],
  };
};
