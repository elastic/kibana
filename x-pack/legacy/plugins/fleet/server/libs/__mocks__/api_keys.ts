/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkUser, internalAuthData } from '../../adapters/framework/adapter_types';
import {
  AccessApiKeyVerificationResponse,
  EnrollmentApiKeyVerificationResponse,
} from '../../repositories/enrollment_api_keys/types';
import { ApiKeyLib as ApiKeyLibType } from '../api_keys';
import {
  EnrollmentApiKey,
  EnrollmentRuleData,
  EnrollmentRule,
} from '../../../common/types/domain_data';

type Interface<T> = {
  [P in keyof T]: T[P];
};

export class ApiKeyLib implements Interface<ApiKeyLibType> {
  private accessApiKeyId = 1;

  public listEnrollmentApiKeys(
    user: FrameworkUser<any>,
    options: {
      page?: number | undefined;
      perPage?: number | undefined;
      kuery?: string | undefined;
      showInactive?: boolean | undefined;
    }
  ): Promise<{ items: any; total: any; page: any; perPage: any }> {
    throw new Error('Method not implemented.');
  }

  public async deleteEnrollmentApiKey(user: FrameworkUser, id: string) {
    throw new Error('Method not implemented.');
  }

  public async deleteEnrollmentApiKeyForPolicyId(user: FrameworkUser, policyId: string) {
    throw new Error('Method not implemented.');
  }

  public async getEnrollmentApiKey(
    user: FrameworkUser,
    keyId: string
  ): Promise<EnrollmentApiKey | null> {
    throw new Error('Method not implemented.');
  }
  public async verifyEnrollmentApiKey(
    user: FrameworkUser
  ): Promise<EnrollmentApiKeyVerificationResponse> {
    if (user.kind === 'authenticated') {
      const apiKeyHeader = user[internalAuthData].headers.authorization.split(' ')[1];
      const apiKey = Buffer.from(apiKeyHeader, 'base64')
        .toString('utf8')
        .split(':')[1];
      if (apiKey === 'VALID_KEY_WITH_POLICY') {
        return {
          valid: true,
          enrollmentApiKey: {
            policy_id: 'policyId',
          } as EnrollmentApiKey,
        };
      }
      if (apiKey === 'VALID_KEY') {
        return { valid: true, enrollmentApiKey: {} as EnrollmentApiKey };
      }
    }
    return {
      valid: false,
      reason: 'Not a valid api key',
    };
  }
  public async verifyAccessApiKey(
    user: FrameworkUser<any>
  ): Promise<AccessApiKeyVerificationResponse> {
    if (user.kind === 'authenticated') {
      const apiKeyHeader = user[internalAuthData].headers.authorization.split(' ')[1];
      const [apiKeyId, apiKey] = Buffer.from(apiKeyHeader, 'base64')
        .toString('utf8')
        .split(':');

      if (apiKey === 'VALID_KEY') {
        return { valid: true, accessApiKeyId: apiKeyId };
      }
    }
    return {
      valid: false,
      reason: 'Not a valid api key',
    };
  }
  public async generateAccessApiKey(
    agentId: string,
    policyId?: string | undefined
  ): Promise<{ key: string; id: string }> {
    const id = this.accessApiKeyId++;
    return {
      id: `mock-access-api-key-id-${id}`,
      key: `mock-access-api-key-${id}`,
    };
  }
  public generateEnrollmentApiKey(
    user: FrameworkUser<any>,
    data: {
      name?: string | undefined;
      policyId?: string | undefined;
      expiration?: string | undefined;
    }
  ): Promise<EnrollmentApiKey> {
    throw new Error('Method not implemented.');
  }
  public addEnrollmentRule(
    user: FrameworkUser<any>,
    enrollmentApiKeyId: string,
    ruleData: EnrollmentRuleData
  ): Promise<EnrollmentRule> {
    throw new Error('Method not implemented.');
  }
  public updateEnrollmentRuleForPolicy(
    user: FrameworkUser<any>,
    enrollmentApiKeyId: string,
    ruleId: string,
    ruleData: EnrollmentRuleData
  ): Promise<EnrollmentRule> {
    throw new Error('Method not implemented.');
  }
  public deleteEnrollmentRule(
    user: FrameworkUser<any>,
    enrollmentApiKeyId: string,
    ruleId: string
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }
  public deleteAllEnrollmentRules(
    user: FrameworkUser<any>,
    enrollmentApiKeyId: string
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
