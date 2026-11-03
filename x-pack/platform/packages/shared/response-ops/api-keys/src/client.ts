/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { ApiKeys, ClientContext, CreateOptions, RequestApiKey } from './create';
import { clone, fromRequest, grant } from './create';
import { invalidateNow } from './invalidate_now';
import { getUiamLogTags } from './log_tags';
import type { InvalidationTarget, StoredApiKeys } from './stored_keys';

export interface ApiKeysClientOptions {
  security: SecurityServiceStart;
  logger: Logger;
  /** Added to UIAM log tags, e.g. `alerting`. */
  pluginTag: string;
  /** Whether UIAM keys may be granted. Defaults to whether the UIAM service is available. */
  uiamEnabled?: boolean;
}

/** Creates and invalidates API keys through the security service. */
export class ApiKeysClient {
  private readonly context: ClientContext;

  constructor({ security, logger, pluginTag, uiamEnabled }: ApiKeysClientOptions) {
    this.context = {
      security,
      logger,
      tags: getUiamLogTags(pluginTag),
      uiamEnabled: uiamEnabled ?? Boolean(security.authc.apiKeys.uiam),
    };
  }

  public grant(request: KibanaRequest, options: CreateOptions): Promise<ApiKeys | null> {
    return grant(this.context, request, options);
  }

  public clone(request: KibanaRequest, options: CreateOptions): Promise<ApiKeys> {
    return clone(this.context, request, options);
  }

  public fromRequest(request: KibanaRequest): RequestApiKey | null {
    return fromRequest(this.context, request);
  }

  public invalidateNow(
    stored: StoredApiKeys,
    options: { subject: string }
  ): Promise<InvalidationTarget[]> {
    return invalidateNow(this.context, stored, options);
  }
}
