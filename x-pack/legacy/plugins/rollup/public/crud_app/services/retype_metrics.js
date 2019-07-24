/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Used when cloning a job from it's deserialised config.
 *
 * When a job is being cloned the metrics returned from the server do not have
 * type information (e.g., numeric, date etc) associated with them. When, for instance,
 * querying the validity of an index we retrieve type information for fields that we use to
 * display specific UI. That can be used to build up a mapping from keys to type fields
 *
 * This function reconnects type information with the metric type (e.g., 'date', or 'numeric').
 * @param object { metrics: deserialised job metric object, typeMaps: { fields: string[], type: string } }
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
