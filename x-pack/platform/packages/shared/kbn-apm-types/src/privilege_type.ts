/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_ARRAY_ITEMS } from './request_limits';

export enum PrivilegeType {
  EVENT = 'event:write',
  AGENT_CONFIG = 'config_agent:read',
}

export enum ClusterPrivilegeType {
  MANAGE_OWN_API_KEY = 'manage_own_api_key',
}

export const privilegesTypeSchema = z
  .array(z.union([z.literal(PrivilegeType.EVENT), z.literal(PrivilegeType.AGENT_CONFIG)]))
  .max(MAX_ARRAY_ITEMS);
