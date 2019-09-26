/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { FrameworkUser } from '../../adapters/framework/adapter_types';
import { RuntimeAgentType } from '../agents/types';

export interface EnrollmentTokenData {
  policy: { id: string; sharedId: string };
}

export interface AccessTokenData {
  policy: { id: string; sharedId: string };
}

export const RuntimeEnrollmentRuleData = t.partial(
  {
    ip_ranges: t.array(t.string),
    window_duration: t.interface(
      {
        from: t.string,
        to: t.string,
      },
      'WindowDuration'
    ),
    types: t.array(RuntimeAgentType),
  },
  'EnrollmentRuleData'
);

export type EnrollmentRuleData = t.TypeOf<typeof RuntimeEnrollmentRuleData>;

export type EnrollmentRule = EnrollmentRuleData & {
  id: string;
  created_at: string;
  updated_at?: string;
};

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
  enrollment_rules: EnrollmentRule[];
  policy_id: string;
  policy_shared_id: string;
  [k: string]: any; // allow to use it as saved object attributes type
}

export interface TokensRepository {
  create(
    user: FrameworkUser,
    data: {
      type: TokenType;
      token: string;
      tokenHash: string;
      active: boolean;
      policy: { id: string };
      expire_at?: string;
    }
  ): Promise<Token>;

  /**
   * Get a token by token.
   * @param token
   */
  getByTokenHash(user: FrameworkUser, tokenHash: string): Promise<Token | null>;

  /**
   * Get a token by token.
   * @param token
   */
  getByPolicyId(user: FrameworkUser, policyId: string): Promise<Token | null>;

  /**
   * Update a token
   * @param token
   */
  update(user: FrameworkUser, id: string, newData: Partial<Token>): Promise<void>;

  /**
   * Delete a token
   * @param token
   */
  delete(user: FrameworkUser, id: string): Promise<void>;
}
