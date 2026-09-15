/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import { getContextWindowSize } from '@kbn/inference-common';

/** Fallback context window when the model's size can't be determined */
export const DEFAULT_CONTEXT_WINDOW = 128_000;

export const getContextWindow = (connector: InferenceConnector): number =>
  getContextWindowSize(connector) ?? DEFAULT_CONTEXT_WINDOW;
