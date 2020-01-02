/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { FrameworkUser } from '../../adapters/framework/adapter_types';
import { RuntimeAgentType } from '../../../common/types/domain_data';

export const SAVED_OBJECT_TYPE = 'enrollment_api_keys';

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

export type EnrollmentApiKeyVerificationResponse =
  | {
      valid: true;
      enrollmentApiKey: EnrollmentApiKey;
    }
  | {
      valid: false;
      reason: string;
    };

export type AccessApiKeyVerificationResponse =
  | {
      valid: true;
      accessApiKeyId: string;
    }
  | {
      valid: false;
      reason: string;
    };

export interface EnrollmentApiKey {
  id: string;
  api_key_id: string;
  api_key: string;
  name?: string;
  created_at: string;
  expire_at?: string;
  active: boolean;
  enrollment_rules: EnrollmentRule[];
  policy_id?: string;
  [k: string]: any; // allow to use it as saved object attributes type
}

export interface EnrollmentApiKeysRepository {
  list(
    user: FrameworkUser<any>,
    options: {
      page?: number;
      perPage?: number;
      kuery?: string;
      showInactive?: boolean;
    }
  ): Promise<{ items: EnrollmentApiKey[]; total: any; page: any; perPage: any }>;
  create(
    user: FrameworkUser,
    data: {
      apiKeyId: string;
      apiKey: string;
      active: boolean;
      expire_at?: string;
      policyId?: string;
      name?: string;
    }
  ): Promise<EnrollmentApiKey>;

  /**
   * Get a key for a given Id.
   */
  getById(user: FrameworkUser, id: string): Promise<EnrollmentApiKey | null>;

  /**
   * Get a key for a given apiKey Id.
   */
  getByApiKeyId(user: FrameworkUser, apiKeyId: string): Promise<EnrollmentApiKey | null>;

  /**
   * Update an apiKey
   */
  update(user: FrameworkUser, id: string, newData: Partial<EnrollmentApiKey>): Promise<void>;

  /**
   * Delete an apiKey
   */
  delete(user: FrameworkUser, id: string): Promise<void>;
}
