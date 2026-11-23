/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Logger, PubSubStart, Topic } from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';

/** Matches the pubsub event id limit. Ids over this length are rejected and then swallowed here. */
const PUBSUB_EVENT_ID_MAX_LENGTH = 256;

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

/**
 * A vendor correlation key is shared by every connector that receives one delivery.
 * Scope it to this space and connector so retries for this receiver stay on one id.
 */
const publicationId = (data: ConnectorEventPublishData): string => {
  const { correlationKey, connectorId, spaceId } = data;
  if (typeof correlationKey !== 'string' || correlationKey.length === 0) {
    return uuidv4();
  }

  const scopedId = [spaceId, connectorId, correlationKey].map(encodeURIComponent).join(':');
  if (scopedId.length <= PUBSUB_EVENT_ID_MAX_LENGTH) {
    return scopedId;
  }

  return createHash('sha256').update(scopedId).digest('hex');
};

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

  const id = publicationId(data);

  try {
    await publisher.pubsub.publish(topic, { id, data });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    publisher.logger.warn(`Failed to publish connector event (eventId=${eventId}): ${detail}`);
  }
};
