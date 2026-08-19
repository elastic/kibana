/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import { i18n } from '@kbn/i18n';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { buildEventId } from '@kbn/connector-specs';
import { z } from '@kbn/zod/v4';
import { EXAMPLE_WEBHOOK_CONNECTOR_TYPE_ID, EXAMPLE_WEBHOOK_RECEIVED_EVENT_KEY } from './constants';

const EchoInputSchema = z.object({
  message: z
    .string()
    .max(10000)
    .describe('Message to echo back. Used to exercise this type as a workflow step.'),
});

const EchoOutputSchema = z.object({
  echo: z.string().describe('The same message that was sent in.'),
});

export type EchoInput = z.infer<typeof EchoInputSchema>;
export type EchoOutput = z.infer<typeof EchoOutputSchema>;

export const exampleWebhookReceivedEventSchema = z.object({
  body: z.unknown().describe('Raw inbound JSON body.'),
  eventType: z
    .string()
    .optional()
    .describe('Optional event type copied from body.eventType for KQL filters.'),
});

export type ExampleWebhookReceivedEvent = z.infer<typeof exampleWebhookReceivedEventSchema>;

export const EXAMPLE_WEBHOOK_RECEIVED_EVENT_ID = buildEventId(
  EXAMPLE_WEBHOOK_CONNECTOR_TYPE_ID,
  EXAMPLE_WEBHOOK_RECEIVED_EVENT_KEY
);

const getOptionalEventType = (rawBody: unknown): string | undefined => {
  if (rawBody === null || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return undefined;
  }
  const eventType = (rawBody as Record<string, unknown>).eventType;
  return typeof eventType === 'string' ? eventType : undefined;
};

/**
 * Local dual-connector fixture (actions + events).
 */
export const exampleWebhookSpec: ConnectorSpec = {
  metadata: {
    id: EXAMPLE_WEBHOOK_CONNECTOR_TYPE_ID,
    displayName: i18n.translate('xpack.workflowsConnectorEventsExample.metadata.displayName', {
      defaultMessage: 'Example webhook (dual connector)',
    }),
    description: i18n.translate('xpack.workflowsConnectorEventsExample.metadata.description', {
      defaultMessage:
        'Example connector with an echo action and a received event. Loaded only with --run-examples. Not on the public inbound events hub.',
    }),
    // registerType treats this as a third-party type; only .server-log / .index may use basic.
    minimumLicense: 'gold',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: ['none'],
  },

  schema: z.object({}),

  actions: {
    echo: {
      isTool: false,
      description:
        'Echoes the input message. Used to confirm this type appears as a workflow step.',
      input: EchoInputSchema,
      output: EchoOutputSchema,
      handler: async (_ctx, input: EchoInput): Promise<EchoOutput> => {
        return { echo: input.message };
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('xpack.workflowsConnectorEventsExample.test.description', {
      defaultMessage: 'Always succeeds. This example connector has no external service.',
    }),
    handler: async () => ({}),
  },

  events: {
    definitions: {
      [EXAMPLE_WEBHOOK_RECEIVED_EVENT_KEY]: {
        eventId: EXAMPLE_WEBHOOK_RECEIVED_EVENT_ID,
        title: i18n.translate('xpack.workflowsConnectorEventsExample.events.received.title', {
          defaultMessage: 'Received',
        }),
        description: i18n.translate(
          'xpack.workflowsConnectorEventsExample.events.received.description',
          {
            defaultMessage: 'Emitted when an inbound payload is accepted for this connector.',
          }
        ),
        eventSchema: exampleWebhookReceivedEventSchema,
      },
    },
    handleEvents: async (ctx) => {
      const eventType = getOptionalEventType(ctx.rawBody);
      const payload: ExampleWebhookReceivedEvent = {
        body: ctx.rawBody,
        ...(eventType !== undefined ? { eventType } : {}),
      };
      return {
        type: 'emit',
        events: [
          {
            eventId: EXAMPLE_WEBHOOK_RECEIVED_EVENT_ID,
            correlationKey: randomUUID(),
            payload,
          },
        ],
      };
    },
  },
};
