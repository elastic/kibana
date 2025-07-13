/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/security-plugin/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { InMemoryConnector } from '../../../../..';
import type { ActionsClientContext } from '../../../../../actions_client';
import type { Connector } from '../../../types';

export interface GetAllParams {
  includeSystemActions?: boolean;
  context: ActionsClientContext;
}

export interface GetAllUnsecuredParams {
  auditLogger?: AuditLogger;
  esClient: ElasticsearchClient;
  inMemoryConnectors: InMemoryConnector[];
  internalSavedObjectsRepository: ISavedObjectsRepository;
  kibanaIndices: string[];
  logger: Logger;
  spaceId: string;
}

export interface GetByIdsWithSecretsUnsecuredParams {
  esClient: ElasticsearchClient;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  inMemoryConnectors: InMemoryConnector[];
  internalSavedObjectsRepository: ISavedObjectsRepository;
  spaceId: string;
  connectorIds: string[];
}

export interface InjectExtraFindDataParams {
  kibanaIndices: string[];
  esClient: ElasticsearchClient;
  connectors: Connector[];
}
