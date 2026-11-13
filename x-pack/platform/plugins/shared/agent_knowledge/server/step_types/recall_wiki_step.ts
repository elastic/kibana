/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { recallWikiStepCommonDefinition } from '@kbn/agent-knowledge-common';
import type { WikiService } from '../services/wiki_service';
import { parseStepInput } from './parse_step_input';

export const getRecallWikiStepDefinition = ({
  getWikiService,
}: {
  getWikiService: () => WikiService;
}) =>
  createServerStepDefinition({
    ...recallWikiStepCommonDefinition,
    handler: async (context) => {
      const input = parseStepInput(recallWikiStepCommonDefinition.inputSchema, context.input);
      const spaceId = context.contextManager.getContext().workflow.spaceId;
      const signal = context.abortSignal;

      const result = await getWikiService().recall({
        aiIndexId: input.ai_index_id,
        spaceId,
        query: input.query,
        entityTypes: input.entity_types,
        slugs: input.slugs,
        status: input.status,
        limit: input.limit,
        signal,
      });

      return { output: result };
    },
  });
