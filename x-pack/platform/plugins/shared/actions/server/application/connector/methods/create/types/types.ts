/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InitialAccess } from '@kbn/ols';
import type { SavedObjectAttributes } from '@kbn/core/server';
import type { ActionsClientContext } from '../../../../../actions_client';

export interface ConnectorCreate {
  actionTypeId: string;
  name: string;
  config: SavedObjectAttributes;
  secrets: SavedObjectAttributes;
  isInboundEventsEnabled?: boolean;
  /** Initial ACL of the connector. The creator becomes the owner. */
  acl?: InitialAccess;
}

export interface ConnectorCreateParams {
  context: ActionsClientContext;
  action: ConnectorCreate;
  options?: { id?: string };
}
