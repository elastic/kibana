/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineTopic, type Topic } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import { publishConnectorEvent, setConnectorEventPublisher } from './publish_connector_event';

jest.mock('uuid', () => ({
  v4: () => 'generated-id',
}));

const slackMessageTopic =
  defineTopic<Topic<{ channel: string }, 'slack2.message'>>('slack2.message');

const message = {
  channel: 'C123',
  connectorId: 'connector-1',
  connectorTypeId: '.slack2',
  spaceId: 'default',
};

describe('publishConnectorEvent', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    setConnectorEventPublisher(undefined);
    jest.clearAllMocks();
  });

  afterEach(() => {
    setConnectorEventPublisher(undefined);
  });

  it('does nothing when no publisher is installed', async () => {
    await expect(publishConnectorEvent('slack2.message', message)).resolves.toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('publishes the correlation key and the enriched data', async () => {
    const pubsub = coreMock.createStart().pubsub;
    setConnectorEventPublisher({
      pubsub,
      logger,
      topics: new Map([[slackMessageTopic.name, slackMessageTopic]]),
    });

    await publishConnectorEvent(slackMessageTopic.name, {
      ...message,
      correlationKey: 'vendor-event-1',
    });

    expect(pubsub.publish).toHaveBeenCalledWith(slackMessageTopic, {
      id: 'vendor-event-1',
      data: { ...message, correlationKey: 'vendor-event-1' },
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('uses a new id when the correlation key is absent', async () => {
    const pubsub = coreMock.createStart().pubsub;
    setConnectorEventPublisher({
      pubsub,
      logger,
      topics: new Map([[slackMessageTopic.name, slackMessageTopic]]),
    });

    await publishConnectorEvent(slackMessageTopic.name, message);

    expect(pubsub.publish).toHaveBeenCalledWith(slackMessageTopic, {
      id: 'generated-id',
      data: message,
    });
  });

  it('logs a missing topic and does not publish', async () => {
    const pubsub = coreMock.createStart().pubsub;
    setConnectorEventPublisher({
      pubsub,
      logger,
      topics: new Map([[slackMessageTopic.name, slackMessageTopic]]),
    });

    await expect(publishConnectorEvent('slack2.hitl_action', message)).resolves.toBeUndefined();

    expect(pubsub.publish).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'Connector event topic is not registered (eventId=slack2.hitl_action)'
    );
  });

  it('logs a rejected publish and does not throw', async () => {
    const pubsub = coreMock.createStart().pubsub;
    pubsub.publish.mockRejectedValue(new Error('bus stopped'));
    setConnectorEventPublisher({
      pubsub,
      logger,
      topics: new Map([[slackMessageTopic.name, slackMessageTopic]]),
    });

    await expect(publishConnectorEvent(slackMessageTopic.name, message)).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to publish connector event (eventId=slack2.message): bus stopped'
    );
  });

  it('does nothing after the publisher is cleared', async () => {
    const pubsub = coreMock.createStart().pubsub;
    setConnectorEventPublisher({
      pubsub,
      logger,
      topics: new Map([[slackMessageTopic.name, slackMessageTopic]]),
    });
    setConnectorEventPublisher(undefined);

    await publishConnectorEvent(slackMessageTopic.name, message);

    expect(pubsub.publish).not.toHaveBeenCalled();
  });
});
