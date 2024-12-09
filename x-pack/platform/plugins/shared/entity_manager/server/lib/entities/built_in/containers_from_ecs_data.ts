/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition, entityDefinitionSchema } from '@kbn/entities-schema';
import { BUILT_IN_ID_PREFIX } from './constants';

export const builtInContainersFromEcsEntityDefinition: EntityDefinition =
  entityDefinitionSchema.parse({
    id: `${BUILT_IN_ID_PREFIX}containers_from_ecs_data`,
    managed: true,
    version: '0.1.0',
    name: 'Containers from ECS data',
    description:
      'This definition extracts container entities from common data streams by looking for the ECS field container.id',
    type: 'container',
    indexPatterns: ['filebeat-*', 'logs-*', 'metrics-*', 'metricbeat-*'],
    identityFields: ['container.id'],
    displayNameTemplate: '{{container.id}}',
    latest: {
      timestampField: '@timestamp',
      lookbackPeriod: '10m',
      settings: {
        frequency: '5m',
      },
    },
    metadata: [
      {
        source: '_index',
        destination: 'source_index',
      },
      {
        source: 'data_stream.type',
        destination: 'source_data_stream.type',
      },
      {
        source: 'data_stream.dataset',
        destination: 'source_data_stream.dataset',
      },
      'container.name',
      'container.image.name',
      'container.image.tag',
      'container.runtime',
      'host.name',
      'host.ip',
      'host.mac',
      'host.architecture',
      'host.os.family',
      'host.os.kernel',
      'host.os.name',
      'host.os.platform',
      'host.os.type',
      'host.os.version',
      'cloud.provider',
      'cloud.region',
      'cloud.availability_zone',
      'cloud.instance.id',
      'cloud.instance.name',
      'cloud.machine.type',
      'cloud.service.name',
      'agent.name',
      'agent.type',
      'agent.ephemeral_id',
    ],
  });
