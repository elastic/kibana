/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { DEFAULT_BEDROCK_MODEL } from './constants';

export const TelemtryMetadataSchema = schema.object({
  pluginId: schema.maybe(schema.string()),
  aggregateBy: schema.maybe(schema.string()),
});

// Connector schema
export const ConfigSchema = schema.object({
  apiUrl: schema.string(),
  defaultModel: schema.string({ defaultValue: DEFAULT_BEDROCK_MODEL }),
});

export const SecretsSchema = schema.object({
  accessKey: schema.string(),
  secret: schema.string(),
});

export const RunActionParamsSchema = schema.object({
  body: schema.string(),
  model: schema.maybe(schema.string()),
  // abort signal from client
  signal: schema.maybe(schema.any()),
  timeout: schema.maybe(schema.number()),
  raw: schema.maybe(schema.boolean()),
});

export const BedrockMessageSchema = schema.object(
  {
    role: schema.string(),
    content: schema.maybe(schema.string()),
    rawContent: schema.maybe(schema.arrayOf(schema.any())),
  },
  {
    validate: (value) => {
      if (value.content === undefined && value.rawContent === undefined) {
        return 'Must specify either content or rawContent';
      } else if (value.content !== undefined && value.rawContent !== undefined) {
        return 'content and rawContent can not be used at the same time';
      }
    },
  }
);

export const BedrockToolChoiceSchema = schema.object({
  type: schema.oneOf([schema.literal('auto'), schema.literal('any'), schema.literal('tool')]),
  name: schema.maybe(schema.string()),
});

export const InvokeAIActionParamsSchema = schema.object({
  messages: schema.arrayOf(BedrockMessageSchema),
  model: schema.maybe(schema.string()),
  temperature: schema.maybe(schema.number()),
  stopSequences: schema.maybe(schema.arrayOf(schema.string())),
  system: schema.maybe(schema.string()),
  maxTokens: schema.maybe(schema.number()),
  // abort signal from client
  signal: schema.maybe(schema.any()),
  timeout: schema.maybe(schema.number()),
  anthropicVersion: schema.maybe(schema.string()),
  tools: schema.maybe(
    schema.arrayOf(
      schema.object({
        name: schema.string(),
        description: schema.string(),
        input_schema: schema.object({}, { unknowns: 'allow' }),
      })
    )
  ),
  toolChoice: schema.maybe(BedrockToolChoiceSchema),
  telemetryMetadata: schema.maybe(TelemtryMetadataSchema),
});

export const InvokeAIActionResponseSchema = schema.object({
  message: schema.string(),
  usage: schema.maybe(
    schema.object({
      input_tokens: schema.number(),
      output_tokens: schema.number(),
    })
  ),
});

export const InvokeAIRawActionParamsSchema = schema.object({
  messages: schema.arrayOf(
    schema.object({
      role: schema.string(),
      content: schema.any(),
    })
  ),
  model: schema.maybe(schema.string()),

  temperature: schema.maybe(schema.number()),
  stopSequences: schema.maybe(schema.arrayOf(schema.string())),
  system: schema.maybe(schema.string()),
  maxTokens: schema.maybe(schema.number()),
  // abort signal from client
  signal: schema.maybe(schema.any()),
  anthropicVersion: schema.maybe(schema.string()),
  timeout: schema.maybe(schema.number()),
  tools: schema.maybe(
    schema.arrayOf(
      schema.object({
        name: schema.string(),
        description: schema.string(),
        input_schema: schema.object({}, { unknowns: 'allow' }),
      })
    )
  ),
  toolChoice: schema.maybe(BedrockToolChoiceSchema),
  telemetryMetadata: schema.maybe(TelemtryMetadataSchema),
});

export const InvokeAIRawActionResponseSchema = schema.object({}, { unknowns: 'allow' });

export const RunApiLatestResponseSchema = schema.object(
  {
    stop_reason: schema.maybe(schema.string()),
    usage: schema.object({
      input_tokens: schema.number(),
      output_tokens: schema.number(),
    }),
    content: schema.arrayOf(
      schema.object(
        { type: schema.string(), text: schema.maybe(schema.string()) },
        { unknowns: 'allow' }
      )
    ),
  },
  { unknowns: 'allow' }
);

export const RunActionResponseSchema = schema.object(
  {
    completion: schema.string(),
    stop_reason: schema.maybe(schema.string()),
    usage: schema.maybe(
      schema.object({
        input_tokens: schema.number(),
        output_tokens: schema.number(),
      })
    ),
  },
  { unknowns: 'ignore' }
);

export const StreamingResponseSchema = schema.any();

// Run action schema
export const DashboardActionParamsSchema = schema.object({
  dashboardId: schema.string(),
});

export const DashboardActionResponseSchema = schema.object({
  available: schema.boolean(),
});

export const BedrockClientSendParamsSchema = schema.object({
  // ConverseCommand | ConverseStreamCommand from @aws-sdk/client-bedrock-runtime
  command: schema.any(),
  // Kibana related properties
  signal: schema.maybe(schema.any()),
  telemetryMetadata: schema.maybe(TelemtryMetadataSchema),
});

export const BedrockClientSendResponseSchema = schema.object({}, { unknowns: 'allow' });
