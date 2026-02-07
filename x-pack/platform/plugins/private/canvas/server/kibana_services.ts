/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/server';
import type { StartDeps } from './plugin';

export let embeddableService: EmbeddableStart;
export let logger: Logger;

export const setKibanaServices = (deps: StartDeps, _logger: Logger) => {
  embeddableService = deps.embeddable;
  logger = _logger;
};
