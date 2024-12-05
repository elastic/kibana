/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO - clint: convert to service abstraction

import { API_ROUTE_TEMPLATES } from '../../common/lib/constants';
import { fetch } from '../../common/lib/fetch';
import { CanvasTemplate } from '../../types';
import { coreServices } from '../services/kibana_services';

const getApiPath = function () {
  const basePath = coreServices.http.basePath.get();
  return `${basePath}${API_ROUTE_TEMPLATES}`;
};

interface ListResponse {
  templates: CanvasTemplate[];
}

export async function list() {
  const templateResponse = await fetch.get<ListResponse>(`${getApiPath()}`);
  return templateResponse.data.templates;
}
