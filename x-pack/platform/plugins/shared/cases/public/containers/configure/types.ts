/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClosureType,
  ActionConnector,
  ActionTypeConnector,
  CaseConnector,
  ConnectorMappingTarget,
  ConnectorMappingSource,
  ConnectorMappingActionType,
  CustomFieldsConfiguration,
} from '../../../common/types/domain';

export type {
  ActionConnector,
  ActionTypeConnector,
  CaseConnector,
  ConnectorMappingActionType,
  ConnectorMappingSource,
  ConnectorMappingTarget,
  ClosureType,
  CustomFieldsConfiguration,
};

export interface CaseConnectorMapping {
  actionType: ConnectorMappingActionType;
  source: ConnectorMappingSource;
  target: string;
}
