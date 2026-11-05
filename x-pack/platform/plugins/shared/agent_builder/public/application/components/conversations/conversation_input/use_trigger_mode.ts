/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatTriggerMode } from '../../../../../common/http_api/chat';
import { useIsSharedConversation } from '../../../hooks/use_conversation';

/**
 * The trigger mode messages are sent with: `auto` in a shared conversation, so the server decides
 * whether the agent responds, and `always` in a private one.
 */
export const useTriggerMode = (): ChatTriggerMode =>
  useIsSharedConversation() ? ChatTriggerMode.Auto : ChatTriggerMode.Always;
