/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildGroupActionsQuery as buildGroupActionsQueryCommon } from '@kbn/alerting-v2-common-queries';

export interface GroupActionRow {
  group_hash: string;
  rule_id: string | null;
  last_deactivate_action: string | null;
  last_snooze_action: string | null;
  snooze_expiry: string | null;
  tags: string | string[] | null;
  last_snooze_actor: string | null;
  last_deactivate_actor: string | null;
}

export const buildGroupActionsQuery = (spaceId: string, groupHashes: string[]) =>
  buildGroupActionsQueryCommon(spaceId, groupHashes);
