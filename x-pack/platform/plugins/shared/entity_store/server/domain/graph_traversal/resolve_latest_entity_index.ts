/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ENTITY_LATEST, getEntitiesAlias } from '../../../common/domain/entity_index';

/**
 * The concrete latest entity index of a space, read from the alias. `LOOKUP JOIN` needs a
 * concrete lookup-mode index name, not the alias or the pattern. Undefined when the alias
 * has no index (the store is not installed); throws when the alias cannot be read.
 */
export const resolveLatestEntityIndex = async (
  esClient: Pick<ElasticsearchClient, 'indices'>,
  namespace: string
): Promise<string | undefined> => {
  const alias = getEntitiesAlias(ENTITY_LATEST, namespace);
  const indices = Object.keys(await esClient.indices.getAlias({ name: alias }));
  return indices.length > 0 ? indices.sort()[indices.length - 1] : undefined;
};
