/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';
import type { OnlineEvalResultSink } from '@kbn/evals-common';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  onlineEvals: schema.object({
    resultSink: schema.oneOf(
      [
        schema.literal<OnlineEvalResultSink>('data_stream'),
        schema.literal<OnlineEvalResultSink>('otel_events'),
      ],
      { defaultValue: 'data_stream' }
    ),
    /**
     * Extra OTLP endpoints that receive a copy of evaluation events. Events are always
     * written to Elasticsearch as `kibana_system`, which dedup and the UI read from.
     */
    exporters: schema.arrayOf(
      schema.object({
        url: schema.uri({ scheme: ['http', 'https'] }),
        headers: schema.maybe(
          schema.recordOf(schema.string({ maxLength: 256 }), schema.string({ maxLength: 4096 }))
        ),
      }),
      { defaultValue: [], maxSize: 10 }
    ),
  }),
});

export type EvalsConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<EvalsConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    enabled: true,
    onlineEvals: {
      resultSink: true,
    },
  },
};
