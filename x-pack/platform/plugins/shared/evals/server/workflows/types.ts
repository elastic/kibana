/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { TaskProviderRegistry } from '../task_providers/types';

export interface EvalStepDeps {
  logger: Logger;
  taskProviderRegistry: TaskProviderRegistry;
  getInferenceStart: () => Promise<InferenceServerStart>;
}
