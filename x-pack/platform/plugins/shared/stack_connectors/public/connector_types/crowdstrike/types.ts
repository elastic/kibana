/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SUB_ACTION, CrowdstrikeHostActionsParams } from '@kbn/connector-schemas/crowdstrike';

export type CrowdstrikeExecuteSubActionParams = CrowdstrikeHostActionsParams;

export interface CrowdstrikeExecuteActionParams {
  subAction: SUB_ACTION;
  subActionParams: CrowdstrikeExecuteSubActionParams;
}
