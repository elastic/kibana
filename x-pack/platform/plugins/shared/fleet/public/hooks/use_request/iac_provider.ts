/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RenderIacTemplateRequest,
  RenderIacTemplateResponse,
} from '../../../common/types/rest_spec/iac_provider';
import { API_VERSIONS, IAC_PROVIDER_API_ROUTES } from '../../../common/constants';

import { sendRequest } from './use_request';

export function sendRenderIacTemplate(body: RenderIacTemplateRequest) {
  return sendRequest<RenderIacTemplateResponse>({
    method: 'post',
    path: IAC_PROVIDER_API_ROUTES.RENDER_TEMPLATE_PATTERN,
    version: API_VERSIONS.internal.v1,
    body,
  });
}
