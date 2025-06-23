/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const { UndiciInstrumentation } = require('@opentelemetry/instrumentation-undici');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

const init = require('../../../../../../src/cli/apm');

registerInstrumentations({
  instrumentations: [
    new UndiciInstrumentation({
      requireParentforSpans: true,
    }),
  ],
});

const shutdown = init(`kbn-inference-cli`);

const { createRunRecipe } = require('./create_run_recipe') as typeof import('./create_run_recipe');

export const runRecipe = createRunRecipe(shutdown);
