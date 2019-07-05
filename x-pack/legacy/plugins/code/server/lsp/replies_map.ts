/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';

export type RepliesMap = Map<
  number,
  [(resp: ResponseMessage) => void, (error: ResponseMessage['error']) => void]
>;

export function createRepliesMap() {
  return new Map() as RepliesMap;
}
