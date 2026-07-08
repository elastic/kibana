/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { z } from '@kbn/zod/v4';

export enum PrivilegeType {
  EVENT = 'event:write',
  AGENT_CONFIG = 'config_agent:read',
}

export enum ClusterPrivilegeType {
  MANAGE_OWN_API_KEY = 'manage_own_api_key',
}

export const privilegesTypeRt = t.array(
  t.union([t.literal(PrivilegeType.EVENT), t.literal(PrivilegeType.AGENT_CONFIG)])
);

/**
 * zod equivalent, additive (see `default_api_types.ts` in `@kbn/apm-api-shared`
 * for why - elastic/kibana#243355).
 */
export const privilegesTypeSchema = z.array(
  z.union([z.literal(PrivilegeType.EVENT), z.literal(PrivilegeType.AGENT_CONFIG)])
);
