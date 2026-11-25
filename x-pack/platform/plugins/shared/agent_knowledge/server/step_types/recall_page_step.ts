/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { recallPageStepCommonDefinition, recallPageStepInputSchema } from '../../common';
import { createPageStore } from '../wiki/page_store';
import type { WikiRegistry } from '../wiki/wiki_registry';
import { parseStepInput, toStepError } from './to_step_error';

export const getRecallPageStepDefinition = ({ registry }: { registry: WikiRegistry }) =>
  createServerStepDefinition({
    ...recallPageStepCommonDefinition,
    handler: async ({ input, contextManager, abortSignal }) => {
      try {
        const {
          wiki_id: wikiId,
          page_type: pageType,
          key,
        } = parseStepInput(recallPageStepInputSchema, input);
        const { index } = registry.resolve(wikiId, pageType);
        const store = createPageStore({
          esClient: contextManager.getScopedEsClient(),
          index,
          spaceId: contextManager.getContext().workflow.spaceId,
          signal: abortSignal,
        });
        const page = await store.get(pageType, key);
        return { output: page ? { found: true, page } : { found: false } };
      } catch (error) {
        throw toStepError(error, 'Failed to read the wiki page');
      }
    },
  });
