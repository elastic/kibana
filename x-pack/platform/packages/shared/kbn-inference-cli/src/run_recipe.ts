/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-var-requires */

import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

const init = require('../../../../../../src/cli/kibana/apm');

registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation({
      requireParentforOutgoingSpans: true,
    }),
    new UndiciInstrumentation({
      requireParentforSpans: true,
    }),
  ],
});

init(`kbn-inference-cli`);

const { createRunRecipe } = require('./create_run_recipe') as typeof import('./create_run_recipe');

export const runRecipe = createRunRecipe();
