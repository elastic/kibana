/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';

const getDataViewSchema = z.object({
  id: z.string().describe('ID of the data view to retrieve.'),
});

export const getDataViewTool = (): BuiltinToolDefinition<typeof getDataViewSchema> => {
  return {
    id: platformCoreTools.getDataView,
    type: ToolType.builtin,
    description:
      'Retrieve detailed information about a specific Kibana data view, including its field mappings and configuration.',
    schema: getDataViewSchema,
    handler: async ({ id }, { dataViewsService, logger }) => {
      logger.debug(`get_dataview tool called with id: ${id}`);

      try {
        const dataView = await dataViewsService.get(id);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                id: dataView.id,
                title: dataView.getIndexPattern(),
                timeFieldName: dataView.timeFieldName,
                fields: dataView.fields.map((field) => ({
                  name: field.name,
                  type: field.type,
                  esTypes: field.esTypes,
                  searchable: field.searchable,
                  aggregatable: field.aggregatable,
                  scripted: field.scripted,
                })),
                fieldFormatMap: dataView.fieldFormatMap,
              },
            },
          ],
        };
      } catch (error) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to retrieve data view: ${error.message}`,
                id,
              },
            },
          ],
        };
      }
    },
    tags: [],
  };
};
