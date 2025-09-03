/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: These instrumentations should eventually be set by initialing
// OpenTelemetry tracing. Right now they would conflict with Elastic
// APM. See https://github.com/elastic/kibana/issues/220914

const { UndiciInstrumentation } = require('@opentelemetry/instrumentation-undici');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

require('../../../../../../../src/setup_node_env');
// we send an empty process.argv argument, as playwright uses the same --config
// flag as kibana, leading it to not read from kibana.{dev.}yml
require('../../../../../../../src/cli/apm')('playwright', []);

registerInstrumentations({
  instrumentations: [
    // undici is needed for Elasticsearch
    new UndiciInstrumentation({
      requireParentforSpans: true,
    }),
    // http is needed for axios etc
    new HttpInstrumentation({
      requireParentforOutgoingSpans: true,
    }),
  ],
});
