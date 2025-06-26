/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract } from '@kbn/core/server';
import { OBSERVABILITY_METRIC_DEFINITIONS } from '../../../../common/saved_object_contants';

import { MetricDefinitionsResponse } from '../../../../common/types';

import { MetricDefinitionSavedObject } from '../../../saved_objects/metric_definition';

export async function getEntityAssociations({
  namespace,

  soClient,
}: {
  namespace: string;
  soClient: SavedObjectsClientContract;
}): Promise<Map<string, MetricDefinitionsResponse[]>> {
  const metricDefinitionSavedObject = await soClient.get<MetricDefinitionSavedObject>(
    OBSERVABILITY_METRIC_DEFINITIONS,
    namespace
  );

  if (!metricDefinitionSavedObject) {
    throw new Error(`Entity definition for type "${namespace}" not found`);
  }

  const entityAssociationsMap = metricDefinitionSavedObject.attributes.groups.reduce(
    (acc, definition) => {
      for (const association of definition.entity_associations ?? []) {
        if (!association) {
          continue;
        }

        const metricDefinition: MetricDefinitionsResponse = {
          id: definition.id,
          instrument: definition.instrument,
          metricName: definition.metric_name,
          unit: definition.unit,
          type: definition.type,
        };

        const existing = acc.get(association);
        if (existing) {
          existing.push(metricDefinition);
        } else {
          acc.set(association, [metricDefinition]);
        }
      }
      return acc;
    },
    new Map<string, MetricDefinitionsResponse[]>()
  );

  return entityAssociationsMap;
}
