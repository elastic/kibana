/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INTERNAL_ROOT = '/internal/automatic_import_v2';
export const AUTOMATIC_IMPORT_V2_API_ROUTES = {
  INTEGRATIONS: {
    GET_ALL: `${INTERNAL_ROOT}/integrations`,
    BY_ID: `${INTERNAL_ROOT}/integrations/{integration_id}`,
    CREATE: `${INTERNAL_ROOT}/integrations`,
  },
  DATA_STREAMS: {
    STOP: `${INTERNAL_ROOT}/data_streams/{data_stream_id}/stop`,
    BY_ID: `${INTERNAL_ROOT}/data_streams/{data_stream_id}`,
  },
};
