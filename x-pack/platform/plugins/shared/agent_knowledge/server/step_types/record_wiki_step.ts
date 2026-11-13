/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { recordWikiStepCommonDefinition } from '@kbn/agent-knowledge-common';
import type { WikiService } from '../services/wiki_service';
import { parseStepInput } from './parse_step_input';

export const getRecordWikiStepDefinition = ({
  getWikiService,
}: {
  getWikiService: () => WikiService;
}) =>
  createServerStepDefinition({
    ...recordWikiStepCommonDefinition,
    handler: async (context) => {
      const input = parseStepInput(recordWikiStepCommonDefinition.inputSchema, context.input);
      const spaceId = context.contextManager.getContext().workflow.spaceId;
      const signal = context.abortSignal;

      const result = await getWikiService().record({
        aiIndexId: input.ai_index_id,
        spaceId,
        edits: input.edits,
        provenance: {
          conversationId: input.conversation_id,
          roundId: input.round_id,
          workflowExecutionId: input.workflow_execution_id,
        },
        signal,
      });

      return { output: result };
    },
  });
