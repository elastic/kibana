/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { createBadRequestError } from '@kbn/agent-builder-common';
import { CONVERSATION_BULK_GET_MAX_IDS } from '../../../../common/constants';

/**
 * Compiles a caller-supplied conversation id list into Elasticsearch query DSL.
 *
 * @param ids - Conversation ids to look up. An empty array compiles to a clause matching nothing.
 * @returns The compiled query.
 * @throws A bad request error when more than {@link CONVERSATION_BULK_GET_MAX_IDS} ids are given.
 */
export const compileConversationIds = (ids: string[]): QueryDslQueryContainer => {
  if (ids.length > CONVERSATION_BULK_GET_MAX_IDS) {
    throw createBadRequestError(
      `Too many conversation ids: ${ids.length} were requested, but at most ${CONVERSATION_BULK_GET_MAX_IDS} may be looked up at once.`
    );
  }

  return { ids: { values: ids } };
};
