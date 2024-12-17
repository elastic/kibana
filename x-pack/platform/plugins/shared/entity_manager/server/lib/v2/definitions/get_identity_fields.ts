/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityV2 } from '@kbn/entities-schema';
import { Logger } from '@kbn/core/server';
import { readSourceDefinitions } from './source_definition';
import { InternalClusterClient } from '../types';
import { UnknownEntityType } from '../errors/unknown_entity_type';
import { InvalidEntityInstance } from '../errors/invalid_entity_instance';

export async function getIdentityFields(
  type: EntityV2['entity.type'],
  clusterClient: InternalClusterClient,
  logger: Logger
) {
  const sources = await readSourceDefinitions(clusterClient, logger, {
    type,
  });

  if (sources.length === 0) {
    throw new UnknownEntityType(`No sources found for type ${type}`);
  }

  const identityFieldsBySource: { [key: string]: string[] } = {};

  sources.forEach((source) => {
    const { id, identity_fields: identityFields } = source;

    identityFieldsBySource[id] = identityFields;
  });

  if (Object.keys(identityFieldsBySource).length === 0) {
    throw new InvalidEntityInstance(
      `Type ${type} is missing some identity fields, no sources could match`
    );
  }

  return identityFieldsBySource;
}
