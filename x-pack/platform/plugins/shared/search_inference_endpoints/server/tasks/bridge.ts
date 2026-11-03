/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTasksKibanaBridge } from '@kbn/core-plugins-server';
import type {
  SearchInferenceEndpointsPluginSetup,
  SearchInferenceEndpointsPluginStart,
} from '../types';

/** The plugin's feature registry in Kibana, so features registered there are seen; a pod builds its own. */
export const searchInferenceEndpointsBridge = createTasksKibanaBridge<
  SearchInferenceEndpointsPluginSetup,
  SearchInferenceEndpointsPluginStart
>();
