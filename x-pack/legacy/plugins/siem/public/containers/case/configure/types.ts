/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticUser, ApiProps } from '../types';
import {
  ActionType,
  CasesConnectorConfiguration,
  CaseField,
  ClosureType,
  Connector,
  ThirdPartyField,
} from '../../../../../../../plugins/case/common/api';

export { ActionType, CaseField, ClosureType, Connector, ThirdPartyField };

export interface CasesConfigurationMapping {
  source: CaseField;
  target: ThirdPartyField;
  actionType: ActionType;
}

export interface CaseConfigure {
  createdAt: string;
  createdBy: ElasticUser;
  connectorId: string;
  closureType: ClosureType;
  updatedAt: string;
  updatedBy: ElasticUser;
  version: string;
}

export interface PatchConnectorProps extends ApiProps {
  connectorId: string;
  config: CasesConnectorConfiguration;
}
