/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { setupRequest } from '../lib/helpers/setup_request';
import { createRoute } from './create_route';
import { listUiIndices } from '../lib/settings/ui_indices/list_ui_indices';
import { getUiIndex } from '../lib/settings/ui_indices/get_ui_index';
import { saveUiIndices } from '../lib/settings/ui_indices/save_ui_indices';

// get list of ui indices and values
export const uiIndicesRoute = createRoute(core => ({
  method: 'GET',
  path: '/api/apm/settings/ui-indices',
  handler: async req => {
    const { server } = core.http;
    const setup = await setupRequest(req);
    return await listUiIndices({ setup, server });
  }
}));

// get configured APM index
export const uiIndexRoute = createRoute(core => ({
  method: 'GET',
  path: '/api/apm/settings/ui-indices/{indexConfigurationName}',
  params: {
    path: t.type({
      indexConfigurationName: t.string
    })
  },
  handler: async (req, { path }) => {
    const { server } = core.http;
    const setup = await setupRequest(req);
    const { indexConfigurationName } = path;
    return await getUiIndex({ setup, server, indexConfigurationName });
  }
}));

// save ui indices
export const saveUiIndicesRoute = createRoute(core => ({
  method: 'POST',
  path: '/api/apm/settings/ui-indices/save',
  params: {
    body: t.partial({
      'apm_oss.sourcemapIndices': t.string,
      'apm_oss.errorIndices': t.string,
      'apm_oss.onboardingIndices': t.string,
      'apm_oss.spanIndices': t.string,
      'apm_oss.transactionIndices': t.string,
      'apm_oss.metricsIndices': t.string,
      'apm_oss.apmAgentConfigurationIndex': t.string
    })
  },
  handler: async (req, { body }) => {
    const { server } = core.http;
    return await saveUiIndices({ server, uiIndices: body });
  }
}));
