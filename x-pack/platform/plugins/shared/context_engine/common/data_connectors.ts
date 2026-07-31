/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Action connector type ids for the data-retrieval connectors that can back an AI index source.
 */
export const DATA_CONNECTOR_TYPE_IDS = [
  // TODO: Review this the team. Do we really need to maintain this list here?
  '.google_drive',
  '.one_drive',
  '.notion',
  '.amazon_s3',
  '.github',
  '.box',
  '.dropbox',
  '.google_cloud_storage',
  '.salesforce',
  '.zendesk',
] as const;

const DATA_CONNECTOR_TYPE_ID_SET: ReadonlySet<string> = new Set(DATA_CONNECTOR_TYPE_IDS);

export const isDataConnectorType = (connectorTypeId: string): boolean =>
  DATA_CONNECTOR_TYPE_ID_SET.has(connectorTypeId);
