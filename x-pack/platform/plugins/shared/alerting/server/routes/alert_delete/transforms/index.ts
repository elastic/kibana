/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { transformAlertDeletePreviewToResponse } from './transform_preview_response/latest';
export { transformRequestToAlertDeletePreview } from './transform_preview_request/latest';

export { transformAlertDeletePreviewToResponse as transformAlertDeletePreviewToResponseV1 } from './transform_preview_response/v1';
export { transformRequestToAlertDeletePreview as transformRequestToAlertDeletePreviewV1 } from './transform_preview_request/v1';
