/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Re-associate type information with the metric type (e.g., 'date', or 'numeric').
 *
 * When a job is being cloned the metrics returned from the server do not have
 * type information (e.g., numeric, date etc) associated with them.
 *
 * @param object { metrics: deserialized job metric object, typeMaps: { fields: string[], type: string } }
 * @returns { { : string, type: string, types: string[] }[] }
 */
export function retypeMetrics({ metrics, typeMaps }) {
  return metrics.map(metric => {
    const { name: metricName } = metric;
    const { type } = typeMaps.find(type => type.fields.some(field => field.name === metricName));
    return {
      ...metric,
      type,
    };
  });
}
