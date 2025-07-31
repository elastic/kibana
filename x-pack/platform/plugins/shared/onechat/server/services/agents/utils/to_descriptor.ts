/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentDescriptor } from '@kbn/onechat-common';

/**
 * Remove extra properties from an agent descriptor supertype. Useful when serializing, e.g. to the browser-side.
 */
export const agentToDescriptor = <T extends AgentDescriptor>({
  type,
  agentId,
  providerId,
  description,
}: T): AgentDescriptor => {
  return { type, agentId, providerId, description };
};
