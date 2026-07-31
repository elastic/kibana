/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_USER_ID } from '@kbn/agent-builder-common/constants';
import { labels } from './i18n';

export const resolveOwnerLabel = (username?: string): string | undefined =>
  username === SYSTEM_USER_ID ? labels.agentOverview.createdByElastic : username;
