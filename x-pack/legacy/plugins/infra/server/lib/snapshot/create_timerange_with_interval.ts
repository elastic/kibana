/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import { RequestHandlerContext } from 'kibana/server';
import { InfraSnapshotRequestOptions } from './types';
import { InfraTimerangeInput } from '../../../public/graphql/types';
import { getMetricsAggregations } from './query_helpers';
import { calculateMetricInterval } from '../../utils/calculate_metric_interval';
import { SnapshotModel, SnapshotModelMetricAggRT } from '../../../common/inventory_models/types';
import { KibanaFramework } from '../adapters/framework/kibana_framework_adapter';
import { getDatasetForField } from '../../routes/metrics_explorer/lib/get_dataset_for_field';

export const createTimeRangeWithInterval = async (
  framework: KibanaFramework,
  requestContext: RequestHandlerContext,
  options: InfraSnapshotRequestOptions
): Promise<InfraTimerangeInput> => {
  const aggregations = getMetricsAggregations(options);
  const modules = await aggregationsToModules(framework, requestContext, aggregations, options);
  const interval =
    (await calculateMetricInterval(
      framework,
      requestContext,
      {
        indexPattern: options.sourceConfiguration.metricAlias,
        timestampField: options.sourceConfiguration.fields.timestamp,
        timerange: { from: options.timerange.from, to: options.timerange.to },
      },
      modules,
      options.nodeType
    )) || 60000;
  return {
    interval: `${interval}s`,
    from: options.timerange.to - interval * 5000, // We need at least 5 buckets worth of data
    to: options.timerange.to,
  };
};

const aggregationsToModules = async (
  framework: KibanaFramework,
  requestContext: RequestHandlerContext,
  aggregations: SnapshotModel,
  options: InfraSnapshotRequestOptions
): Promise<string[]> => {
  const uniqueFields = Object.values(aggregations)
    .reduce((fields, agg) => {
      if (SnapshotModelMetricAggRT.is(agg)) {
        return uniq(fields.concat(Object.values(agg).map(a => a?.field)));
      }
      return fields;
    }, [] as Array<string | undefined>)
    .filter(v => v) as string[];
  const fields = await Promise.all(
    uniqueFields.map(
      async field =>
        await getDatasetForField(
          framework,
          requestContext,
          field as string,
          options.sourceConfiguration.metricAlias
        )
    )
  );
  return fields.filter(f => f) as string[];
};
