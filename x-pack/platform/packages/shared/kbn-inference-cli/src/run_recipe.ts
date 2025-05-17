/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import init from '../../../../../../src/cli/apm';

registerInstrumentations({
  instrumentations: [
    new UndiciInstrumentation({
      requireParentforSpans: true,
    }),
  ],
});

const shutdown = init(`kbn-inference-cli`);

import { createRunRecipe } from './create_run_recipe';

export const runRecipe = createRunRecipe(shutdown);
