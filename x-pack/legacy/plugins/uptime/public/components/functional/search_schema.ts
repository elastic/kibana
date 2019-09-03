/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const filterBarSearchSchema = {
  strict: true,
  fields: {
    'monitor.id': { type: 'string' },
    'monitor.status': { type: 'string' },
    'monitor.ip': { type: 'string' },
    'monitor.host': { type: 'string' },
    'monitor.scheme': { type: 'string' },
    'url.port': { type: 'number' },
  },
};
