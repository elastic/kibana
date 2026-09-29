/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatService } from '../../../services/chat/chat_service';

/** One in-flight converse request: its fetch controller, its execution id, and whether Stop was pressed. */
export interface StreamHandle {
  controller: AbortController;
  executionId: string;
  abortRequested: boolean;
}

/**
 * Stop asks the server to wind the run down; the server then streams `execution_aborted` and
 * ends the stream itself, so the fetch stays open. It is only dropped when the server could not
 * record the terminal: unknown or never-started execution, timeout, or the call failing.
 */
export const requestAbort = (handle: StreamHandle, chatService: Pick<ChatService, 'abort'>) => {
  handle.abortRequested = true;
  chatService.abort(handle.executionId).then(
    ({ terminal_persisted: terminalPersisted }) => {
      if (!terminalPersisted) {
        handle.controller.abort();
      }
    },
    () => handle.controller.abort()
  );
};

export const isStreamCancelled = ({ abortRequested, controller }: StreamHandle): boolean =>
  abortRequested || controller.signal.aborted;
