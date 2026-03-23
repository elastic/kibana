/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queryKeys } from './query_keys';
import { mutationKeys } from './mutation_keys';

export const ruleKeys = {
  all: [queryKeys.root] as const,
  lists: queryKeys.lists,
  list: queryKeys.list,
  details: queryKeys.details,
  detail: queryKeys.detail,
  create: mutationKeys.create,
  update: mutationKeys.update,
  delete: mutationKeys.delete,
  bulkDelete: mutationKeys.bulkDelete,
  bulkEnable: mutationKeys.bulkEnable,
  bulkDisable: mutationKeys.bulkDisable,
};
