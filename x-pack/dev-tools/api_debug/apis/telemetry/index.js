/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const name = 'telemetry';
export const description = 'Get the clusters stats from the Kibana server';
export const method = 'POST';
export const path = '/api/telemetry/v2/clusters/_stats';

export const body = { unencrypted: true, refreshCache: true };
