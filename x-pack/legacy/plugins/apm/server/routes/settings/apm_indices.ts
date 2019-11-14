/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { createRoute } from '../create_route';
import {
  getApmIndices,
  getApmIndexSettings
} from '../../lib/settings/apm_indices/get_apm_indices';
import { saveApmIndices } from '../../lib/settings/apm_indices/save_apm_indices';

// get list of apm indices and values
export const apmIndexSettingsRoute = createRoute((core, { server }) => ({
  method: 'GET',
  path: '/api/apm/settings/apm-index-settings',
  handler: async req => {
    const config = server.config();
    const savedObjectsClient = req.server.savedObjects.getScopedSavedObjectsClient(
      req
    );
    return await getApmIndexSettings({ config, savedObjectsClient });
  }
}));

// get apm indices configuration object
export const apmIndicesRoute = createRoute((core, { server }) => ({
  method: 'GET',
  path: '/api/apm/settings/apm-indices',
  handler: async req => {
    const config = server.config();
    const savedObjectsClient = req.server.savedObjects.getScopedSavedObjectsClient(
      req
    );
    return await getApmIndices({ config, savedObjectsClient });
  }
}));

// save ui indices
export const saveApmIndicesRoute = createRoute(() => ({
  method: 'POST',
  path: '/api/apm/settings/apm-indices/save',
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
    const savedObjectsClient = req.server.savedObjects.getScopedSavedObjectsClient(
      req
    );
    return await saveApmIndices(savedObjectsClient, body);
  }
}));
