/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { recordEntryStepCommonDefinition, recordEntryStepInputSchema } from '../../common';
import { createPageStore } from '../wiki/page_store';
import type { WikiRegistry } from '../wiki/wiki_registry';
import { parseStepInput, toStepError } from './to_step_error';

export const getRecordEntryStepDefinition = ({
  registry,
  logger,
}: {
  registry: WikiRegistry;
  logger: Logger;
}) =>
  createServerStepDefinition({
    ...recordEntryStepCommonDefinition,
    handler: async ({ input, contextManager, abortSignal }) => {
      try {
        const {
          wiki_id: wikiId,
          page_type: pageType,
          key,
          title,
          entry,
          conversation_id: conversationId,
        } = parseStepInput(recordEntryStepInputSchema, input);
        const {
          index,
          pageTypeNames,
          pageType: { entriesHeading },
        } = registry.resolve(wikiId, pageType);
        const { workflow, execution } = contextManager.getContext();
        const store = createPageStore({
          esClient: contextManager.getScopedEsClient(),
          logger,
          index,
          pageTypes: pageTypeNames,
          spaceId: workflow.spaceId,
          signal: abortSignal,
        });
        const { outcome, entryCount } = await store.addEntry({
          pageType,
          key,
          title,
          entriesHeading,
          entry,
          provenance: { workflowExecutionId: execution.id, conversationId },
        });
        return { output: { outcome, entry_count: entryCount } };
      } catch (error) {
        throw toStepError(error, 'Failed to record the wiki entry');
      }
    },
  });
