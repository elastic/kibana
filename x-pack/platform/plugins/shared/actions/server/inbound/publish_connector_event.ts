/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, PubSubStart, Topic } from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';

/** Spoke payload plus the hub fields. Extra spoke fields stay on the published object. */
export interface ConnectorEventPublishData {
  readonly connectorId: string;
  readonly connectorTypeId: string;
  readonly spaceId: string;
  readonly correlationKey?: string;
  readonly [key: string]: unknown;
}

interface ConnectorEventPublisher {
  pubsub: Pick<PubSubStart, 'publish'>;
  logger: Logger;
  topics: ReadonlyMap<string, Topic<unknown>>;
}

let activePublisher: ConnectorEventPublisher | undefined;

/** Installed from plugin start and cleared on stop. Unset, publish is a no-op. */
export const setConnectorEventPublisher = (
  publisher: ConnectorEventPublisher | undefined
): void => {
  activePublisher = publisher;
};

/** Publishes one connector event. A missing publisher, token, or rejected publish does not throw. */
export const publishConnectorEvent = async (
  eventId: string,
  data: ConnectorEventPublishData
): Promise<void> => {
  const publisher = activePublisher;
  if (!publisher) {
    return;
  }

  const topic = publisher.topics.get(eventId);
  if (!topic) {
    publisher.logger.warn(`Connector event topic is not registered (eventId=${eventId})`);
    return;
  }

  const id =
    typeof data.correlationKey === 'string' && data.correlationKey.length > 0
      ? data.correlationKey
      : uuidv4();

  try {
    await publisher.pubsub.publish(topic, { id, data });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    publisher.logger.warn(`Failed to publish connector event (eventId=${eventId}): ${detail}`);
  }
};
