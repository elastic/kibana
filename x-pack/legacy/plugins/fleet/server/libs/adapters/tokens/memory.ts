/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { TokenType, Token, TokenAdapter as TokenAdapterType } from './adapter_types';

/**
 * Memory adapter for persisting tokens, for tests purposes only.
 */
export class MemoryTokenAdapter implements TokenAdapterType {
  public tokens: { [k: string]: Token } = {};
  private tokenId = 1;
  public async create({
    type,
    tokenHash,
    active,
    config,
    expire_at,
  }: {
    type: TokenType;
    tokenHash: string;
    active: boolean;
    config: { id: string; sharedId: string };
    expire_at?: string;
  }): Promise<Token> {
    const id = `tokens-${this.tokenId++}`;
    this.tokens[id] = {
      id,
      active,
      created_at: moment().toISOString(),
      type,
      tokenHash,
      expire_at,
      config_id: config.id,
      config_shared_id: config.sharedId,
    };

    return this.tokens[id];
  }

  public async getByTokenHash(tokenHash: string): Promise<Token | null> {
    return Object.values(this.tokens).find(t => t.tokenHash === tokenHash) || null;
  }

  public async update(id: string, newData: Partial<Token>): Promise<void> {
    const token = this.tokens[id];

    Object.assign(token, newData);
  }

  public async delete(id: string): Promise<void> {
    delete this.tokens[id];
  }
}
