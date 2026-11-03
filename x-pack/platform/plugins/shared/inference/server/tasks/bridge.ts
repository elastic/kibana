/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTasksKibanaBridge } from '@kbn/core-plugins-server';
import type { InferenceRuntimeStart } from '../runtime';
import type { InferenceServerSetup } from '../types';

/** The inference the plugin starts in Kibana; a task pod builds its own over its actions. */
export const inferenceBridge = createTasksKibanaBridge<
  InferenceServerSetup,
  InferenceRuntimeStart
>();
