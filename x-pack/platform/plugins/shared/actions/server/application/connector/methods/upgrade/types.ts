/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClientContext } from '../../../../actions_client';
import type { Connector } from '../../types';

export type ConnectorUpgradeStatus = 'current' | 'upgraded' | 'reconfiguration_required';

export interface ConnectorUpgradeResult {
  status: ConnectorUpgradeStatus;
  fromVersion: string;
  toVersion: string;
  connector: Connector;
}

export interface ConnectorUpgradeParams {
  context: ActionsClientContext;
  id: string;
}
