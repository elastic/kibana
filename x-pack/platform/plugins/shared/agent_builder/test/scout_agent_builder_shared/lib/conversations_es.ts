/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';
import { CHAT_CONVERSATIONS_INDEX } from './constants';

export async function deleteAllConversationsFromEs(esClient: EsClient): Promise<void> {
  await esClient.deleteByQuery({
    index: CHAT_CONVERSATIONS_INDEX,
    query: { match_all: {} },
    wait_for_completion: true,
    refresh: true,
    conflicts: 'proceed',
    ignore_unavailable: true,
  });
}
