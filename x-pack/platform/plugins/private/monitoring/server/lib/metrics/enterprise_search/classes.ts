/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Metric, MetricOptions } from '../classes';

type EnterpriseSearchMetricOptions = Pick<
  MetricOptions,
  'field' | 'metricAgg' | 'label' | 'description' | 'format' | 'units'
> &
  Partial<Pick<MetricOptions, 'title' | 'derivative'>>;

export class EnterpriseSearchMetric extends Metric {
  constructor(opts: EnterpriseSearchMetricOptions) {
    super({
      ...opts,
      app: 'enterprise_search',
      ...EnterpriseSearchMetric.getMetricFields(),
    });
  }

  static getMetricFields() {
    return {
      uuidField: 'enterprisesearch.cluster_uuid',
      timestampField: '@timestamp',
    };
  }
}

export type EnterpriseSearchMetricFields = ReturnType<
  typeof EnterpriseSearchMetric.getMetricFields
>;
