/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { ChangeHistoryClient } from '@kbn/change-history';
import type { RuleChangesHistoryServiceContract } from './rule_changes_history_service';
import type { RuleChangesHistoryClientContract } from './rule_changes_history_client';

export const RuleChangesHistoryServiceToken = Symbol.for(
  'alerting_v2.RuleChangesHistoryService'
) as ServiceIdentifier<RuleChangesHistoryServiceContract>;

/** DI token for the raw `@kbn/change-history` {@link ChangeHistoryClient}. */
export const ChangeHistoryClientToken = Symbol.for(
  'alerting_v2.ChangeHistoryClient'
) as ServiceIdentifier<ChangeHistoryClient>;

/** DI token for the domain rule change-history read client. */
export const RuleChangesHistoryClientToken = Symbol.for(
  'alerting_v2.RuleChangesHistoryClient'
) as ServiceIdentifier<RuleChangesHistoryClientContract>;
