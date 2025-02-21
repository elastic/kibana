/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { transformAlertDeletionPreviewToResponse } from './transform_response/latest';
export { transformRequestToAlertDeletionPreview } from './transform_request/latest';

export { transformAlertDeletionPreviewToResponse as transformAlertDeletionPreviewToResponseV1 } from './transform_response/v1';
export { transformRequestToAlertDeletionPreview as transformRequestToAlertDeletionPreviewV1 } from './transform_request/v1';
