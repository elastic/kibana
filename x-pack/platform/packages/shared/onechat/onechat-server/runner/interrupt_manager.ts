/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InterruptRequest } from '@kbn/onechat-common/chat/interruptions';

export interface InterruptManager {
  set(toolCallId: string, interruptRequest: InterruptRequest): void;
  clear(): void;
  forToolCallId(toolCallId: string): ToolInterruptManager;
}

export interface ToolInterruptManager {
  /**
   * Returns the current interrupt request, if any.
   */
  getCurrentInterrupt(): InterruptRequest | undefined;
}
