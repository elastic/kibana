/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const name = 'kibana_stats';
export const description = 'Get the extended Kibana usage stats from the Kibana server';
export const method = 'GET';
export const path = '/api/stats?extended=true';
