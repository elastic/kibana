/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityV2 } from '@kbn/entities-schema';
import { Logger } from '@kbn/core/server';
import { compact } from 'lodash';
import { readSourceDefinitions } from './source_definition';
import { InternalClusterClient } from '../types';
import { UnknownEntityType } from '../errors/unknown_entity_type';
import { InvalidEntityInstance } from '../errors/invalid_entity_instance';

export async function instanceAsFilter(
  instance: EntityV2,
  clusterClient: InternalClusterClient,
  logger: Logger
) {
  const sources = await readSourceDefinitions(clusterClient, logger, {
    type: instance['entity.type'],
  });

  if (sources.length === 0) {
    throw new UnknownEntityType(`No sources found for type ${instance['entity.type']}`);
  }

  const sourceFilters = compact<string>(
    sources.map((source) => {
      const { identity_fields: identityFields } = source;

      const instanceHasRequiredFields = identityFields.every((identityField) =>
        instance[identityField] ? true : false
      );

      if (!instanceHasRequiredFields) {
        return undefined;
      }

      const fieldFilters = identityFields.map(
        (identityField) => `${identityField}: "${instance[identityField]}"`
      );

      return `(${fieldFilters.join(' AND ')})`;
    })
  );

  if (sourceFilters.length === 0) {
    throw new InvalidEntityInstance(
      `Entity ${instance['entity.id']} of type ${instance['entity.type']} is missing some identity fields, no sources could match`
    );
  }

  return sourceFilters.join(' OR ');
}
