/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEventId } from '@kbn/connector-specs';
import { EXAMPLE_WEBHOOK_RECEIVED_EVENT_ID, exampleWebhookSpec } from './connector_spec';
import { EXAMPLE_WEBHOOK_CONNECTOR_TYPE_ID, EXAMPLE_WEBHOOK_RECEIVED_EVENT_KEY } from './constants';

describe('exampleWebhookSpec', () => {
  it('declares a dual connector with echo action and received event', () => {
    expect(exampleWebhookSpec.metadata.id).toBe(EXAMPLE_WEBHOOK_CONNECTOR_TYPE_ID);
    expect(exampleWebhookSpec.metadata.minimumLicense).toBe('gold');
    expect(exampleWebhookSpec.metadata.supportedFeatureIds).toEqual(['workflows']);
    expect(exampleWebhookSpec.actions.echo).toBeDefined();
    expect(
      exampleWebhookSpec.events?.definitions[EXAMPLE_WEBHOOK_RECEIVED_EVENT_KEY]
    ).toBeDefined();
  });

  it('derives eventId via buildEventId', () => {
    expect(EXAMPLE_WEBHOOK_RECEIVED_EVENT_ID).toBe(
      buildEventId(EXAMPLE_WEBHOOK_CONNECTOR_TYPE_ID, EXAMPLE_WEBHOOK_RECEIVED_EVENT_KEY)
    );
    expect(
      exampleWebhookSpec.events?.definitions[EXAMPLE_WEBHOOK_RECEIVED_EVENT_KEY]?.eventId
    ).toBe(EXAMPLE_WEBHOOK_RECEIVED_EVENT_ID);
  });

  it('echoes the input message', async () => {
    const result = await exampleWebhookSpec.actions.echo.handler({} as never, { message: 'hello' });
    expect(result).toEqual({ echo: 'hello' });
  });

  it('maps inbound body into a received emit', async () => {
    const { events } = exampleWebhookSpec;
    expect(events).toBeDefined();
    if (events === undefined) {
      throw new Error('expected events on exampleWebhookSpec');
    }

    const rawBody = { eventType: 'order.created', orderId: '1' };
    const result = await events.handleEvents({
      spaceId: 'default',
      log: { info: jest.fn() } as never,
      connectorId: 'sales-ingress',
      connectorTypeId: EXAMPLE_WEBHOOK_CONNECTOR_TYPE_ID,
      config: {},
      rawBody,
    });

    expect(result.type).toBe('emit');
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.eventId).toBe(EXAMPLE_WEBHOOK_RECEIVED_EVENT_ID);
    expect(result.events[0]?.payload).toEqual({
      body: rawBody,
      eventType: 'order.created',
    });
    expect(result.events[0]?.correlationKey).toEqual(expect.any(String));
  });
});
