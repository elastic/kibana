/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectorSpecHasEvents, connectorsSpecs } from '@kbn/connector-specs';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { connectorEventSchema, slack2HitlAction } from '@kbn/connector-topics';
import { i18n } from '@kbn/i18n';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';

type ConnectorSpecWithEvents = ConnectorSpec & {
  events: NonNullable<ConnectorSpec['events']>;
};

const isConnectorSpecWithEvents = (spec: ConnectorSpec): spec is ConnectorSpecWithEvents =>
  connectorSpecHasEvents(spec);

/**
 * Connector catalogs append ` (v2)` so a new type can sit next to a legacy one.
 * The trigger menu has a single entry per connector, so that suffix is omitted.
 */
const connectorTriggerDisplayName = (displayName: string): string =>
  displayName.replace(/ \(v\d+\)$/, '');

/**
 * Menu groups and autocomplete read this title. The ` - ` separator is the same
 * one the actions menu uses to name a trigger group
 */
const formatConnectorEventTriggerTitle = (displayName: string, eventTitle: string): string =>
  i18n.translate('workflows.triggers.connectorEvent.displayNameLabel', {
    defaultMessage: '{displayName} - {eventTitle}',
    values: { displayName: connectorTriggerDisplayName(displayName), eventTitle },
  });

export const getConnectorEventTriggerDefinitions = ({
  inboundEventsEnabled,
  specs = Object.values(connectorsSpecs),
}: {
  inboundEventsEnabled: boolean;
  specs?: ConnectorSpec[];
}): CommonTriggerDefinition[] => {
  if (!inboundEventsEnabled) {
    return [];
  }

  return specs.filter(isConnectorSpecWithEvents).flatMap((spec) =>
    Object.values(spec.events.definitions)
      // HITL interactivity resumes a paused step; it must not start workflows.
      .filter((eventDefinition) => eventDefinition.eventId !== slack2HitlAction.name)
      .map((eventDefinition) => ({
        id: eventDefinition.eventId,
        title: formatConnectorEventTriggerTitle(spec.metadata.displayName, eventDefinition.title),
        description: eventDefinition.description,
        eventSchema: connectorEventSchema(eventDefinition.eventSchema),
        stability: 'tech_preview' as const,
        requiresConnectorId: true,
      }))
  );
};

/**
 * Maps a connector-event trigger id (e.g. `inboundWebhook.received`) to the
 * connector type id used for instance lookup (e.g. `.inboundWebhook`).
 */
export const getConnectorTypeIdForTriggerEventId = (
  eventId: string,
  specs: ConnectorSpec[] = Object.values(connectorsSpecs)
): string | undefined => {
  const spec = specs
    .filter(isConnectorSpecWithEvents)
    .find((candidate) =>
      Object.values(candidate.events.definitions).some(
        (eventDefinition) => eventDefinition.eventId === eventId
      )
    );
  return spec?.metadata.id;
};
