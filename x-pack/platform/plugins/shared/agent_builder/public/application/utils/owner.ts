/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_USER_ID } from '@kbn/agent-builder-common/constants';
import { labels } from './i18n';

export const resolveOwnerLabel = (
  owner: { id?: string; username?: string } | undefined,
  profileMap?: Map<string, string>
): string | undefined => {
  if (!owner) return undefined;
  if (owner.username === SYSTEM_USER_ID) return labels.agentOverview.createdByElastic;
  const resolved = owner.id ? profileMap?.get(owner.id) : undefined;
  return resolved ?? owner.username;
};
