/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { ChangeHistoryClient } from '@kbn/change-history';
import { RULE_CHANGES_HISTORY_DATASET, RULE_CHANGES_HISTORY_MODULE } from './constants';

/**
 * Builds the rule changes history {@link ChangeHistoryClient}, pre-scoped to the
 * rule module/dataset. Callers only supply the logger and the current Kibana
 * version.
 */
export function createChangeHistoryClient({
  logger,
  kibanaVersion,
}: {
  logger: Logger;
  kibanaVersion: string;
}): ChangeHistoryClient {
  return new ChangeHistoryClient({
    module: RULE_CHANGES_HISTORY_MODULE,
    dataset: RULE_CHANGES_HISTORY_DATASET,
    logger,
    kibanaVersion,
  });
}
