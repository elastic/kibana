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

require('@kbn/setup-node-env');

// Build synthetic argv from the TRACING_EXPORTERS env var when set.
// This allows CI (and local users) to configure trace exporters without a kibana.dev.yml.
// The argv overrides take priority over kibana.dev.yml via applyConfigOverrides.
const argv = [];
const tracingExporters = process.env.TRACING_EXPORTERS;
if (tracingExporters) {
  JSON.parse(tracingExporters); // validate parseable JSON; throws early if malformed
  argv.push(
    '--telemetry.enabled=true',
    '--telemetry.tracing.enabled=true',
    '--telemetry.tracing.sample_rate=1',
    `--telemetry.tracing.exporters=${tracingExporters}`
  );
}

// we send an empty process.argv argument (or our synthetic overrides), as playwright
// uses the same --config flag as kibana, leading it to not read from kibana.{dev.}yml
require('../../../../../../../src/cli/kibana/apm')('playwright', argv);

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
