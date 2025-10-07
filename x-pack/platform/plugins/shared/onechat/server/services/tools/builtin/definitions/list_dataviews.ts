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

const listDataViewsSchema = z.object({
  pattern: z
    .string()
    .optional()
    .describe(
      `Optional pattern to filter data views by title.
      - Correct examples: 'logs*', '*metrics*', 'my-dataview'
      - Should only be used if you are certain of a specific pattern to filter on.
      - If not provided, all data views will be returned.`
    ),
});

export const listDataViewsTool = (): BuiltinToolDefinition<typeof listDataViewsSchema> => {
  return {
    id: platformCoreTools.listDataViews,
    type: ToolType.builtin,
    description: `List the Kibana data views available to the user.

The 'pattern' optional parameter can be used to filter data views by title.
This parameter should only be used when you already know of a specific pattern to filter on,
e.g. if the user provided one. Otherwise, do not try to invent or guess a pattern.`,
    schema: listDataViewsSchema,
    handler: async ({ pattern }, { dataViewsService, logger }) => {
      logger.debug(`list_dataviews tool called with pattern: ${pattern}`);

      const dataViews = await dataViewsService.getIdsWithTitle();

      let filtered = dataViews;
      if (pattern) {
        const regexPattern = new RegExp(pattern.replace(/\*/g, '.*'));
        filtered = dataViews.filter((dv) => regexPattern.test(dv.title));
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              dataviews: filtered.map((dv) => ({
                id: dv.id,
                title: dv.title,
              })),
              total: filtered.length,
            },
          },
        ],
      };
    },
    tags: [],
  };
};
