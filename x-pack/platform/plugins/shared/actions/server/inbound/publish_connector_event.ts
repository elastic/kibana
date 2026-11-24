/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { PUBSUB_MAX_ID_LENGTH, type Logger, type PubSubStart, type Topic } from '@kbn/core/server';
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

/** Held for the publisher added when inbound events are published. */
const activePublisher: { current: ConnectorEventPublisher | undefined } = { current: undefined };

/**
 * A vendor correlation key is shared by every connector that receives one delivery.
 * Scope it to this space and connector so retries for this receiver stay on one id.
 * JSON keeps every accepted string, including a lone surrogate. Hash when the scoped id
 * is longer than the bus allows.
 */
const publicationId = (data: ConnectorEventPublishData): string => {
  const { correlationKey, connectorId, spaceId } = data;
  if (typeof correlationKey !== 'string' || correlationKey.length === 0) {
    return uuidv4();
  }

  const scopedId = JSON.stringify([spaceId, connectorId, correlationKey]);
  if (scopedId.length <= PUBSUB_MAX_ID_LENGTH) {
    return scopedId;
  }

  return createHash('sha256').update(scopedId).digest('hex');
};

/** Installed from plugin start and cleared on stop. Unset, publish is a no-op. */
export const setConnectorEventPublisher = (
  publisher: ConnectorEventPublisher | undefined
): void => {
  activePublisher.current = publisher;
};

/** Publishes one connector event. A missing publisher, token, or rejected publish does not throw. */
export const publishConnectorEvent = async (
  eventId: string,
  data: ConnectorEventPublishData
): Promise<void> => {
  const publisher = activePublisher.current;
  if (!publisher) {
    return;
  }

  const topic = publisher.topics.get(eventId);
  if (!topic) {
    publisher.logger.warn(`Connector event topic is not registered (eventId=${eventId})`);
    return;
  }

  try {
    await publisher.pubsub.publish(topic, { id: publicationId(data), data });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    publisher.logger.warn(`Failed to publish connector event (eventId=${eventId}): ${detail}`);
  }
};
