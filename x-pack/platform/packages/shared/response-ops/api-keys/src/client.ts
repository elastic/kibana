/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { isApiKeyAuthenticated } from './create/choose_source';
import { clone, grant } from './create/grant';
import { resolve } from './create/resolve';
import { reuse } from './create/reuse';
import type { ApiKeysProfile, ClientContext, CreateOptions, ResolveOptions } from './create/types';
import { invalidateNow } from './invalidate/invalidate_now';
import type { InvalidationTarget } from './invalidate/targets';
import type { UiamLogTags } from './log_tags';
import { getUiamLogTags } from './log_tags';
import type { ApiKeys } from './store/api_keys';

export interface ApiKeysClientOptions {
  security: SecurityServiceStart;
  logger: Logger;
  profile: ApiKeysProfile;
  /** Whether UIAM keys may be used. Defaults to whether the UIAM service is available. */
  uiamEnabled?: boolean;
}

/** Creates and invalidates a plugin's API keys through the security service. */
export class ApiKeysClient {
  private readonly context: ClientContext;

  constructor({ security, logger, profile, uiamEnabled }: ApiKeysClientOptions) {
    this.context = {
      security,
      logger,
      profile,
      tags: getUiamLogTags(profile.pluginTag),
      uiamEnabled: uiamEnabled ?? Boolean(security.authc.apiKeys.uiam),
    };
  }

  public get uiamEnabled(): boolean {
    return this.context.uiamEnabled;
  }

  public get tags(): UiamLogTags {
    return this.context.tags;
  }

  /** Reuses, clones or grants the keys to store for the request. `null` when API keys are disabled. */
  public resolve(request: KibanaRequest, options: ResolveOptions): Promise<ApiKeys | null> {
    return resolve(this.context, request, options);
  }

  public grant(request: KibanaRequest, options: CreateOptions): Promise<ApiKeys | null> {
    return grant(this.context, request, options);
  }

  public clone(request: KibanaRequest, options: CreateOptions): Promise<ApiKeys> {
    return clone(this.context, request, options);
  }

  public reuse(
    request: KibanaRequest,
    options: Pick<CreateOptions, 'subject' | 'esOnly'>
  ): ApiKeys {
    return reuse(this.context, request, options);
  }

  public isApiKeyAuthenticated(request: KibanaRequest): boolean {
    return isApiKeyAuthenticated(this.context.security, request);
  }

  public invalidateNow(
    keys: ApiKeys | undefined,
    options: { subject: string }
  ): Promise<InvalidationTarget[]> {
    return invalidateNow(this.context, keys, options);
  }
}
