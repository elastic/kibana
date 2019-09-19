/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { TokenType, Token, TokenAdapter as TokenAdapterType } from './adapter_types';
import { FrameworkUser } from '../framework/adapter_types';

/**
 * Memory adapter for persisting tokens, for tests purposes only.
 */
export class MemoryTokenAdapter implements TokenAdapterType {
  public tokens: { [k: string]: Token } = {};
  private tokenId = 1;
  public async create(
    user: FrameworkUser,
    {
      type,
      tokenHash,
      token,
      active,
      policy,
      expire_at,
    }: {
      type: TokenType;
      token: string;
      tokenHash: string;
      active: boolean;
      policy: { id: string; sharedId: string };
      expire_at?: string;
    }
  ): Promise<Token> {
    const id = `tokens-${this.tokenId++}`;
    this.tokens[id] = {
      id,
      active,
      created_at: moment().toISOString(),
      type,
      token,
      tokenHash,
      expire_at,
      policy_id: policy.id,
      policy_shared_id: policy.sharedId,
      enrollment_rules: [],
    };

    return this.tokens[id];
  }

  public async getByTokenHash(user: FrameworkUser, tokenHash: string): Promise<Token | null> {
    return Object.values(this.tokens).find(t => t.tokenHash === tokenHash) || null;
  }

  public async update(user: FrameworkUser, id: string, newData: Partial<Token>): Promise<void> {
    const token = this.tokens[id];

    Object.assign(token, newData);
  }

  public async getByPolicyId(user: FrameworkUser, policyId: string) {
    return Object.values(this.tokens).find(t => t.policy_id === policyId) || null;
  }

  public async delete(user: FrameworkUser, id: string): Promise<void> {
    delete this.tokens[id];
  }
}
