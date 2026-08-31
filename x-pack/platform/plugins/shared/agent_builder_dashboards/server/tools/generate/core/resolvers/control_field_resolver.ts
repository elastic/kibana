/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexFields } from '@kbn/agent-builder-genai-utils';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { getErrorMessage } from '../utils';
import {
  resolveAggregatableControlField,
  type ControlFieldTypes,
} from '../operations/resolve_aggregatable_control_field';
import type { ResolveControlField } from '../operations/types';

export const createControlFieldResolver = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): ResolveControlField => {
  const fieldsByIndex = new Map<string, Promise<ControlFieldTypes>>();

  const loadFields = (index: string): Promise<ControlFieldTypes> => {
    const cached = fieldsByIndex.get(index);
    if (cached) {
      return cached;
    }

    const pending = getIndexFields({ indices: [index], esClient }).then((result) => {
      const fields: ControlFieldTypes = {};
      for (const field of result[index]?.fields ?? []) {
        fields[field.path] = field.type;
      }
      return fields;
    });

    fieldsByIndex.set(index, pending);
    return pending;
  };

  return async ({ fieldName, index }) => {
    try {
      const fields = await loadFields(index);
      return resolveAggregatableControlField({ fieldName, fields });
    } catch (error) {
      const message = getErrorMessage(error);
      logger.warn(`Could not load index fields for controls on "${index}": ${message}`);
      return { error: `Could not load mapping for index "${index}": ${message}` };
    }
  };
};
