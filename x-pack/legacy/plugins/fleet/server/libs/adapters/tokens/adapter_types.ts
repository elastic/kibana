/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest } from '../framework/adapter_types';

export interface EnrollmentTokenData {
  policy: { id: string; sharedId: string };
}

export interface AccessTokenData {
  policy: { id: string; sharedId: string };
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
  token: string;
  tokenHash: string;
  created_at: string;
  expire_at?: string;
  active: boolean;
  policy_id: string;
  policy_shared_id: string;
  [k: string]: any; // allow to use it as saved object attributes type
}

export interface TokenAdapter {
  create(
    request: FrameworkRequest,
    data: {
      type: TokenType;
      token: string;
      tokenHash: string;
      active: boolean;
      policy: { id: string; sharedId: string };
      expire_at?: string;
    }
  ): Promise<Token>;

  /**
   * Get a token by token.
   * @param token
   */
  getByTokenHash(request: FrameworkRequest, tokenHash: string): Promise<Token | null>;

  /**
   * Get a token by token.
   * @param token
   */
  getByPolicyId(request: FrameworkRequest, policyId: string): Promise<Token | null>;

  /**
   * Update a token
   * @param token
   */
  update(request: FrameworkRequest, id: string, newData: Partial<Token>): Promise<void>;

  /**
   * Delete a token
   * @param token
   */
  delete(request: FrameworkRequest, id: string): Promise<void>;
}
