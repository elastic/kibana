/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { getErrorMessage } from '../utils';
import {
  resolveAggregatableControlField,
  type FieldCapsFields,
} from '../operations/resolve_aggregatable_control_field';
import type { ResolveControlField } from '../operations/types';

export const createControlFieldResolver = ({
  esClient,
  logger,
  projectRouting,
}: {
  esClient: IScopedClusterClient;
  logger: Logger;
  projectRouting?: string;
}): ResolveControlField => {
  const fieldsByIndex = new Map<string, FieldCapsFields>();

  return async ({ fieldName, index }) => {
    try {
      let fields = fieldsByIndex.get(index);
      if (!fields) {
        const response = await esClient.asCurrentUser.fieldCaps({
          index,
          fields: '*',
          include_unmapped: false,
          ...(projectRouting ? { project_routing: projectRouting } : {}),
        });
        fields = (response.fields ?? {}) as FieldCapsFields;
        fieldsByIndex.set(index, fields);
      }

      return resolveAggregatableControlField({ fieldName, fields });
    } catch (error) {
      logger.warn(
        `Could not verify control field "${fieldName}" on ${index}: ${getErrorMessage(error)}`
      );
      return {
        error: `Could not verify field "${fieldName}" on index "${index}".`,
      };
    }
  };
};
