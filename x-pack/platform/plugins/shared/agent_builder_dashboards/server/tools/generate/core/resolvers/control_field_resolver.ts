/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResultStore } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { getErrorMessage } from '../utils';
import {
  resolveAggregatableControlField,
  type ControlFieldTypes,
} from '../operations/resolve_aggregatable_control_field';
import type { ResolveControlField } from '../operations/types';
import { loadIndexMappingFieldsFromResultStore } from './index_mapping_tool_fields';

export const createControlFieldResolver = ({
  resultStore,
  logger,
}: {
  resultStore?: Pick<ToolResultStore, 'listEntries' | 'getEntry'>;
  logger: Logger;
}): ResolveControlField => {
  let fieldsByIndexPromise: Promise<Map<string, ControlFieldTypes>> | undefined;

  const loadFieldsByIndex = (): Promise<Map<string, ControlFieldTypes>> => {
    if (!fieldsByIndexPromise) {
      fieldsByIndexPromise = resultStore
        ? loadIndexMappingFieldsFromResultStore(resultStore).catch((error) => {
            logger.warn(
              `Could not load get_index_mapping results for control fields: ${getErrorMessage(
                error
              )}`
            );
            return new Map();
          })
        : Promise.resolve(new Map());
    }
    return fieldsByIndexPromise;
  };

  return async ({ fieldName, index }) => {
    const fieldsByIndex = await loadFieldsByIndex();
    const fields = fieldsByIndex.get(index);
    if (!fields) {
      return { fieldName };
    }

    return resolveAggregatableControlField({ fieldName, fields });
  };
};
