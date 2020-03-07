/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticUser } from '../types';

export { Connector } from '../../../../../../../plugins/case/common/api';

export type CaseConfigureClosureType = 'close-by-user' | 'close-by-pushing';
export type ActionType = 'nothing' | 'overwrite' | 'append';
export type ThirdPartyField = 'comment' | 'description' | 'short_description' | 'not_mapped';
export type CaseField = 'name' | 'description' | 'comment';

export interface CasesConfigurationMapping {
  source: CaseField;
  target: ThirdPartyField;
  actionType: ActionType;
}

export interface CaseConfigure {
  createdAt: string;
  createdBy: ElasticUser;
  connectorId: string;
  closureType: CaseConfigureClosureType;
  updatedAt: string;
  updatedBy: ElasticUser;
  version: string;
}
