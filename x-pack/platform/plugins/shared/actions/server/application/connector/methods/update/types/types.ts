/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectAttributes } from '@kbn/core/server';
import { ActionsClientContext } from '../../../../../actions_client';

export interface ConnectorUpdate {
  name: string;
  config: SavedObjectAttributes;
  secrets: SavedObjectAttributes;
}

export interface ConnectorUpdateParams {
  context: ActionsClientContext;
  id: string;
  action: ConnectorUpdate;
}
