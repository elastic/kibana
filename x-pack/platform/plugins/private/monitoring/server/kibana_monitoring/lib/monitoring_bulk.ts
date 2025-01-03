/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: Track down where this function is called by the elasticsearch client setup so we can properly type these

export function monitoringBulk(Client: any, _config: any, components: any) {
  const ca = components.clientAction.factory;
  Client.prototype.monitoring = components.clientAction.namespaceFactory();
  const monitoring = Client.prototype.monitoring.prototype;

  /**
   * Perform a [monitoring.bulk](http://www.elastic.co/guide/en/elasticsearch/reference/master/docs-bulk.html) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   * @param {String} params.system_id - Reporting application id
   * @param {String} params.system_api_version - Reporting application API version
   * @param {Number} params.interval - Collection interval in string format (e.g., '10s' or '10000ms')
   * @param {String} params.consistency - Explicit write consistency setting for the operation
   * @param {Boolean} params.refresh - Refresh the index after performing the operation
   * @param {String} params.routing - Specific routing value
   * @param {Date, Number} params.timeout - Explicit operation timeout
   * @param {String} params.type - Default document type for items which don't provide one
   * @param {String, String[], Boolean} params.fields - Default comma-separated list of fields to return in the response for updates
   */
  monitoring.bulk = ca({
    params: {
      system_id: {
        type: 'string',
      },
      system_api_version: {
        type: 'string',
      },
      type: {
        type: 'string',
      },
      interval: {
        type: 'string',
      },
    },
    urls: [
      {
        fmt: '/_monitoring/<%=type%>/bulk',
        req: {
          type: {
            type: 'string',
          },
        },
      },
      {
        fmt: '/_monitoring/bulk',
      },
    ],
    needBody: true,
    bulkBody: true,
    method: 'POST',
  });
}
