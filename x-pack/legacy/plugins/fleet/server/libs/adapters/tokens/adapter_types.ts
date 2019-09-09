/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface EnrollmentTokenData {
  config: { id: string; sharedId: string };
}

export interface AccessTokenData {
  config: { id: string; sharedId: string };
}

export type TokenVerificationResponse =
  | {
      valid: true;
      type: TokenType;
      token: AccessTokenData;
    }
  | {
      valid: false;
      reason: string;
    };

export enum TokenType {
  ENROLMENT_TOKEN = 'ENROLMENT_TOKEN',
  ACCESS_TOKEN = 'ACCESS_TOKEN',
}

export interface Token {
  id: string;
  type: TokenType;
  tokenHash: string;
  created_at: string;
  expire_at?: string;
  active: boolean;
  config_id: string;
  config_shared_id: string;
  [k: string]: any; // allow to use it as saved object attributes type
}

export interface TokenAdapter {
  create(data: {
    type: TokenType;
    tokenHash: string;
    active: boolean;
    config: { id: string; sharedId: string };
    expire_at?: string;
  }): Promise<Token>;

  /**
   * Get a token by token.
   * @param token
   */
  getByTokenHash(tokenHash: string): Promise<Token | null>;

  /**
   * Update a token
   * @param token
   */
  update(id: string, newData: Partial<Token>): Promise<void>;

  /**
   * Delete a token
   * @param token
   */
  delete(id: string): Promise<void>;
}
