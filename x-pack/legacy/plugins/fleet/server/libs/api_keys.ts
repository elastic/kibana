/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as _ from 'lodash';
import Boom from 'boom';
import uuid from 'uuid/v4';
import { FakeRequest, KibanaRequest } from 'kibana/server';
import {
  EnrollmentApiKeyVerificationResponse,
  EnrollmentApiKeysRepository,
  AccessApiKeyVerificationResponse,
} from '../repositories/enrollment_api_keys/types';
import { FrameworkUser, internalAuthData } from '../adapters/framework/adapter_types';
import { DEFAULT_POLICY_ID } from '../../common/constants';
import {
  EnrollmentApiKey,
  EnrollmentRuleData,
  EnrollmentRule,
} from '../../common/types/domain_data';
import { FleetServerLib } from './types';
import { FleetPluginsStart } from './compose/kibana';

export class ApiKeyLib {
  constructor(
    private readonly enrollmentApiKeysRepository: EnrollmentApiKeysRepository,
    private readonly libs: FleetServerLib,
    private readonly pluginsStart: FleetPluginsStart
  ) {}

  public async getEnrollmentApiKey(user: FrameworkUser, keyId: string) {
    return await this.enrollmentApiKeysRepository.getById(user, keyId);
  }

  public async listEnrollmentApiKeys(
    user: FrameworkUser,
    options: { page?: number; perPage?: number; kuery?: string; showInactive?: boolean }
  ): Promise<{ items: any; total: any; page: any; perPage: any }> {
    return await this.enrollmentApiKeysRepository.list(user, options);
  }

  /**
   * Verify if an an enrollment api key is valid and active
   */
  public async verifyEnrollmentApiKey(
    user: FrameworkUser
  ): Promise<EnrollmentApiKeyVerificationResponse> {
    try {
      const { apiKeyId } = this._parseApiKey(user);
      await this._authenticate(user);
      const enrollmentApiKey = await this.enrollmentApiKeysRepository.getByApiKeyId(
        this.libs.framework.getInternalUser(),
        apiKeyId
      );
      if (!enrollmentApiKey || !enrollmentApiKey.active) {
        throw new Error('Enrollement api key does not exists or is not active');
      }

      return {
        valid: true,
        enrollmentApiKey,
      };
    } catch (error) {
      return {
        valid: false,
        reason: error.message || 'ApiKey is not valid',
      };
    }
  }

  /**
   * Verify if an an enrollment api key is valid and active
   */
  public async verifyAccessApiKey(user: FrameworkUser): Promise<AccessApiKeyVerificationResponse> {
    try {
      const { apiKeyId } = this._parseApiKey(user);

      await this._authenticate(user);

      return {
        valid: true,
        accessApiKeyId: apiKeyId,
      };
    } catch (error) {
      return {
        valid: false,
        reason: error.message || 'ApiKey is not valid',
      };
    }
  }

  public async generateAccessApiKey(
    agentId: string,
    policyId?: string
  ): Promise<{ key: string; id: string }> {
    const name = this._getAccesstApiKeyName(agentId);

    const key = await this._createAPIKey(name, {
      'fleet-agent': {
        index: [
          {
            names: ['logs-*', 'metrics-*'],
            privileges: ['write'],
          },
        ],
      },
    });

    if (!key) {
      throw new Error('Unable to create an access api key');
    }

    return { id: key.id, key: Buffer.from(`${key.id}:${key.api_key}`).toString('base64') };
  }

  /**
   * Generate a new enrollment api key
   */
  public async generateEnrollmentApiKey(
    user: FrameworkUser,
    data: {
      name?: string;
      policyId?: string;
      expiration?: string;
    }
  ): Promise<EnrollmentApiKey> {
    const id = uuid();
    const { name: providedKeyName, policyId = DEFAULT_POLICY_ID } = data;

    const name = this._getEnrollmentApiKeyName(id, providedKeyName, policyId);

    const key = await this._createAPIKey(name, {});

    if (!key) {
      throw new Error('Unable to create an enrollment api key');
    }

    const apiKey = Buffer.from(`${key.id}:${key.api_key}`).toString('base64');

    return await this.enrollmentApiKeysRepository.create(user, {
      active: true,
      apiKeyId: key.id,
      apiKey,
      name,
      policyId,
    });
  }

  public async deleteEnrollmentApiKeyForPolicyId(user: FrameworkUser, policyId: string) {
    let hasMore = true;
    let page = 1;
    while (hasMore) {
      const { items } = await this.enrollmentApiKeysRepository.list(user, {
        page: page++,
        perPage: 100,
        kuery: `enrollment_api_keys.policy_id:${policyId}`,
      });

      if (items.length === 0) {
        hasMore = false;
      }

      for (const apiKey of items) {
        await this.deleteEnrollmentApiKey(user, apiKey.id);
      }
    }
  }

  public async deleteEnrollmentApiKey(user: FrameworkUser, id: string) {
    const enrollmentApiKey = await this.enrollmentApiKeysRepository.getById(user, id);
    if (!enrollmentApiKey) {
      throw Boom.notFound('Enrollment API key not found');
    }

    await this._invalidateAPIKey(id);

    await this.enrollmentApiKeysRepository.delete(user, id);
  }

  private _parseApiKey(user: FrameworkUser) {
    if (user.kind !== 'authenticated') {
      throw new Error('Error must provide an authenticated user');
    }

    const authorizationHeader = user[internalAuthData].headers.authorization;

    if (!authorizationHeader) {
      throw new Error('Authorization header must be set');
    }

    if (!authorizationHeader.startsWith('ApiKey ')) {
      throw new Error('Authorization header is malformed');
    }

    const apiKey = authorizationHeader.split(' ')[1];
    if (!apiKey) {
      throw new Error('Authorization header is malformed');
    }
    const apiKeyId = Buffer.from(apiKey, 'base64')
      .toString('utf8')
      .split(':')[0];

    return {
      apiKey,
      apiKeyId,
    };
  }

  private _getEnrollmentApiKeyName(id: string, name?: string, policyId?: string): string {
    return name ? `${name} (${id})` : id;
  }

  private _getAccesstApiKeyName(agentId: string): string {
    return agentId;
  }

  public async addEnrollmentRule(
    user: FrameworkUser,
    enrollmentApiKeyId: string,
    ruleData: EnrollmentRuleData
  ) {
    const enrollmentApiKey = await this.enrollmentApiKeysRepository.getById(
      user,
      enrollmentApiKeyId
    );
    if (!enrollmentApiKey) {
      throw Boom.notFound('Enrollment api key not found.');
    }

    const rule = {
      ...ruleData,
      id: uuid(),
      created_at: new Date().toISOString(),
    };

    await this.enrollmentApiKeysRepository.update(user, enrollmentApiKey.id, {
      enrollment_rules: enrollmentApiKey.enrollment_rules.concat([rule]),
    });

    return rule;
  }

  public async updateEnrollmentRuleForPolicy(
    user: FrameworkUser,
    enrollmentApiKeyId: string,
    ruleId: string,
    ruleData: EnrollmentRuleData
  ): Promise<EnrollmentRule> {
    const enrollmentApiKey = await this._getEnrollemntApiKeyByIdOrThrow(user, enrollmentApiKeyId);

    const ruleToUpdate = enrollmentApiKey.enrollment_rules.find(rule => rule.id === ruleId);
    if (!ruleToUpdate) {
      throw Boom.notFound(`Rule not found: ${ruleId}`);
    }
    const ruleIndex = enrollmentApiKey.enrollment_rules.indexOf(ruleToUpdate);

    const rule = {
      ...ruleToUpdate,
      ...ruleData,
      updated_at: new Date().toISOString(),
    };

    await this.enrollmentApiKeysRepository.update(user, enrollmentApiKey.id, {
      enrollment_rules: [
        ...enrollmentApiKey.enrollment_rules.slice(0, ruleIndex),
        rule,
        ...enrollmentApiKey.enrollment_rules.slice(ruleIndex + 1),
      ],
    });

    return rule;
  }

  public async deleteEnrollmentRule(
    user: FrameworkUser,
    enrollmentApiKeyId: string,
    ruleId: string
  ) {
    const enrollmentApiKey = await this._getEnrollemntApiKeyByIdOrThrow(user, enrollmentApiKeyId);
    const ruleIndex = enrollmentApiKey.enrollment_rules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex < 0) {
      throw Boom.notFound(`Rule not found: ${ruleId}`);
    }

    await this.enrollmentApiKeysRepository.update(user, enrollmentApiKey.id, {
      enrollment_rules: [
        ...enrollmentApiKey.enrollment_rules.slice(0, ruleIndex),
        ...enrollmentApiKey.enrollment_rules.slice(ruleIndex + 1),
      ],
    });
  }

  public async deleteAllEnrollmentRules(user: FrameworkUser, enrollmentApiKeyId: string) {
    const enrollmentApiKey = await this._getEnrollemntApiKeyByIdOrThrow(user, enrollmentApiKeyId);
    await this.enrollmentApiKeysRepository.update(user, enrollmentApiKey.id, {
      enrollment_rules: [],
    });
  }

  private async _invalidateAPIKey(id: string) {
    const adminUser = await this.pluginsStart.ingest.outputs.getAdminUser();
    const request: FakeRequest = {
      headers: {
        authorization: `Basic ${Buffer.from(`${adminUser.username}:${adminUser.password}`).toString(
          'base64'
        )}`,
      },
    };

    return this.pluginsStart.security.authc.invalidateAPIKey(request as KibanaRequest, {
      id,
    });
  }

  private async _createAPIKey(name: string, roleDescriptors: any) {
    const adminUser = await this.pluginsStart.ingest.outputs.getAdminUser();
    const request: FakeRequest = {
      headers: {
        authorization: `Basic ${Buffer.from(`${adminUser.username}:${adminUser.password}`).toString(
          'base64'
        )}`,
      },
    };

    return this.pluginsStart.security.authc.createAPIKey(request as KibanaRequest, {
      name,
      role_descriptors: roleDescriptors,
    });
  }

  private async _authenticate(user: FrameworkUser) {
    if (user.kind !== 'authenticated') {
      throw new Error('Invalid user');
    }

    const res = await this.pluginsStart.security.authc.isAuthenticated(user[internalAuthData]);

    if (!res) {
      throw new Error('ApiKey is not valid: impossible to authicate user');
    }
  }

  private async _getEnrollemntApiKeyByIdOrThrow(user: FrameworkUser, id: string) {
    const apiKey = await this.enrollmentApiKeysRepository.getById(user, id);
    if (!apiKey) {
      throw Boom.notFound(`No enrollment api key found`);
    }
    return apiKey;
  }
}
