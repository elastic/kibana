/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RawRule } from '../../../types';
import type { RuleDomain } from '../../../application/rule/types';
import type { AdHocRunStatus } from '../../../../common/constants';

export interface AdHocRunSchedule extends Record<string, unknown> {
  interval: string;
  status: AdHocRunStatus;
  runAt: string;
}

// This is the rule information stored in the AD_HOC_RUN_SAVED_OBJECT_TYPE saved object
// - we do not include the rule ID because that is stored in the SO references array
// - we copy over the API key from the rule at the time the backfill was scheduled to use in
//   the ad hoc task runner
// - all the other rule fields are copied because we use it as part of rule execution
// - we copy over this information in order to run the rule as it was configured when
//   the backfill job was scheduled. if there are updates to the rule configuration
//   after the backfill is scheduled, they will not be reflected during the backfill run.
type AdHocRunSORule = Pick<
  RawRule,
  | 'name'
  | 'tags'
  | 'alertTypeId'
  | 'actions'
  | 'params'
  | 'apiKeyOwner'
  | 'apiKeyCreatedByUser'
  | 'consumer'
  | 'enabled'
  | 'schedule'
  | 'createdBy'
  | 'updatedBy'
  | 'revision'
> & {
  createdAt: string;
  updatedAt: string;
};

// This is the rule information after loaded from persistence with the
// rule ID injected from the SO references array
type AdHocRunRule = Omit<AdHocRunSORule, 'actions'> & Pick<RuleDomain, 'id' | 'actions'>;

export interface AdHocRunSO extends Record<string, unknown> {
  apiKeyId: string;
  apiKeyToUse: string;
  createdAt: string;
  duration: string;
  enabled: boolean;
  end?: string;
  rule: AdHocRunSORule;
  spaceId: string;
  start: string;
  status: AdHocRunStatus;
  schedule: AdHocRunSchedule[];
}

export interface AdHocRun {
  apiKeyId: string;
  apiKeyToUse: string;
  createdAt: string;
  duration: string;
  enabled: boolean;
  end?: string;
  id: string;
  rule: AdHocRunRule;
  spaceId: string;
  start: string;
  status: AdHocRunStatus;
  schedule: AdHocRunSchedule[];
}
