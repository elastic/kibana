/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { dataStreamSavedObjectType } from './data_stream';
export { integrationSavedObjectType } from './integration';
export { INTEGRATION_SAVED_OBJECT_TYPE, DATA_STREAM_SAVED_OBJECT_TYPE } from './constants';
export type { IntegrationAttributes, DataStreamAttributes } from './schemas/types';
