/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectorsSpecs } from '@kbn/connector-specs';
import {
  getConnectorEventTopicName,
  slack2HitlAction,
  type ConnectorEventHubFields,
  type ConnectorEventTopicDefinition,
  type ConnectorEventTopicName,
} from '@kbn/connector-topics';
import { defineTopic, type Topic } from '@kbn/core/server';
import type { z } from '@kbn/zod/v4';

/**
 * Spec schemas are typed as `ZodObject`, so the spoke payload widens to `Record<string, unknown>`.
 * The token keeps the hub fields from `connectorEventSchema` instead.
 */
const defineConnectorEventTopic = <TSchema extends z.ZodObject, TName extends string>(
  definition: ConnectorEventTopicDefinition<TSchema, TName>
): Topic<ConnectorEventHubFields, ConnectorEventTopicName<TName>> =>
  defineTopic<Topic<ConnectorEventHubFields, ConnectorEventTopicName<TName>>>(
    getConnectorEventTopicName(definition.name)
  );

/** Registers one topic per connector event. `slack2.hitl_action` stays off the bus. */
export const registerConnectorEventTopics = (
  registerTopic: (topic: Topic<ConnectorEventHubFields>) => void
): Map<string, Topic<ConnectorEventHubFields>> => {
  const topics = new Map<string, Topic<ConnectorEventHubFields>>();
  const definitions = Object.values(connectorsSpecs).flatMap((spec) =>
    spec.events
      ? Object.values(spec.events.definitions).filter(
          (definition) => definition.eventId !== slack2HitlAction.name
        )
      : []
  );
  for (const definition of definitions) {
    const topic = defineConnectorEventTopic({
      name: definition.eventId,
      eventSchema: definition.eventSchema,
    });
    registerTopic(topic);
    topics.set(definition.eventId, topic);
  }
  return topics;
};
