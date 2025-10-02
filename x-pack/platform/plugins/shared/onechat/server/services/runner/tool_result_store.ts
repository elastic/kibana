/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound, ToolResult } from '@kbn/onechat-common';
import type { ToolResultStore, WritableToolResultStore } from '@kbn/onechat-server';
import { extractConversationToolResults } from './utils';

export const createResultStore = (conversation?: ConversationRound[]): WritableToolResultStore => {
  return new ToolResultStoreImpl(conversation ? extractConversationToolResults(conversation) : []);
};

class ToolResultStoreImpl implements WritableToolResultStore {
  private readonly results: Map<string, ToolResult> = new Map();

  constructor(results?: ToolResult[]) {
    if (results) {
      this.results = new Map(results.map((result) => [result.tool_result_id, result]));
    }
  }

  asReadonly(): ToolResultStore {
    return {
      has: (resultId) => this.has(resultId),
      get: (resultId) => this.get(resultId),
    };
  }

  add(result: ToolResult): void {
    this.results.set(result.tool_result_id, result);
  }

  delete(resultId: string): boolean {
    return this.results.delete(resultId);
  }

  has(resultId: string): boolean {
    return this.results.has(resultId);
  }

  get(resultId: string): ToolResult {
    if (!this.results.has(resultId)) {
      throw new Error(`Result with id ${resultId} does not exist`);
    }
    return this.results.get(resultId)!;
  }
}
