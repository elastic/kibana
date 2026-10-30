/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { Topic } from '@kbn/core/server';
import { defineTopic } from '@kbn/core/server';

/** An incident in an external system changed, and the cases pushed to it may need a sync. */
export interface ExternalIncidentUpdatedData {
  spaceId: string;
  connectorId: string;
  externalId: string;
  /** When the incident changed, as the external system reports it. */
  updatedAt?: string;
}

export type ExternalIncidentUpdatedTopic = Topic<
  ExternalIncidentUpdatedData,
  'cases.externalIncident.updated'
>;

export const externalIncidentUpdatedTopic = defineTopic<ExternalIncidentUpdatedTopic>(
  'cases.externalIncident.updated'
);

/**
 * The same change of the same incident always gets the same event id, so a redelivered
 * notification can be recognised. Without a change timestamp, every notification is new.
 */
export const getExternalIncidentEventId = ({
  spaceId,
  connectorId,
  externalId,
  updatedAt,
}: ExternalIncidentUpdatedData): string => {
  if (updatedAt == null) {
    return uuidv4();
  }

  return createHash('sha256')
    .update(JSON.stringify([spaceId, connectorId, externalId, updatedAt]))
    .digest('hex');
};
