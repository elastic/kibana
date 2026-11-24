/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, PubSubStart, Topic } from '@kbn/core/server';

interface ConnectorEventPublisher {
  pubsub: Pick<PubSubStart, 'publish'>;
  logger: Logger;
  topics: ReadonlyMap<string, Topic<unknown>>;
}

/** Held for the publisher added when inbound events are published. */
const activePublisher: { current: ConnectorEventPublisher | undefined } = { current: undefined };

/** Installed from plugin start and cleared on stop. */
export const setConnectorEventPublisher = (
  publisher: ConnectorEventPublisher | undefined
): void => {
  activePublisher.current = publisher;
};
