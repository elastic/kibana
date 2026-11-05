/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncExternalStore } from 'react';
import { getChatStatusShimmer, subscribeChatStatusShimmer } from './chat_status_shimmer';

/** Whether chat status lines play a shimmer while work is still in progress. */
export const useChatStatusShimmer = (): boolean =>
  useSyncExternalStore(subscribeChatStatusShimmer, getChatStatusShimmer, getChatStatusShimmer);
