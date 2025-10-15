/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useOnechatSpaceId, OnechatSpaceIdProvider } from './use_space_id';
import {
  useOnechatLastConversation,
  type LastConversation,
  type SelectedConversation,
} from './use_last_conversation';

export { useOnechatSpaceId, OnechatSpaceIdProvider, useOnechatLastConversation };
export type { LastConversation, SelectedConversation };
