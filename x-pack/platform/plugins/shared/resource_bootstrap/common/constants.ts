/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STATUS_API_PATH = '/internal/resource_bootstrap/status';

export const APPLY_TASK_TYPE = 'ResourceBootstrap:Apply';

export const STATUS_SAVED_OBJECT_TYPE = 'resource-bootstrap-status';
export const STATUS_SAVED_OBJECT_ID = 'latest';

export const REQUESTS_SAVED_OBJECT_TYPE = 'resource-bootstrap-requests';
export const REQUESTS_SAVED_OBJECT_ID = 'latest';

export const LEDGER_SAVED_OBJECT_TYPE = 'resource-bootstrap-ledger';

export const MAX_REPORTED_ERRORS = 100;
export const MAX_REPORTED_MESSAGE_LENGTH = 1000;
