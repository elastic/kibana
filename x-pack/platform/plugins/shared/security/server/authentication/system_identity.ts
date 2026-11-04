/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SystemIdentity } from '@kbn/security-plugin-types-server';
import { z } from '@kbn/zod';

import { SERVICE_ACCOUNT_TOKEN_MAX_LENGTH } from '../../common/service_accounts';
import type { UiamServicePublic } from '../uiam';

/**
 * The subset of UIAM's `_authenticate` response this class depends on. A caller authenticated by
 * Kibana's mTLS certificate alone is a `project` service account principal; anything else means
 * the request was not authenticated the way we intended and the token must not be handed out.
 */
const kibanaAuthenticateResponseSchema = z.object({
  type: z.literal('project'),
  token: z.string().min(1).max(SERVICE_ACCOUNT_TOKEN_MAX_LENGTH),
});

interface UiamSystemIdentityOptions {
  logger: Logger;
  uiam: UiamServicePublic;
}

/**
 * Kibana's own UIAM identity, backed by the project service account UIAM derives from Kibana's
 * mTLS client certificate. Deliberately stateless: every call mints a fresh token.
 */
export class UiamSystemIdentity implements SystemIdentity {
  private readonly logger: Logger;
  private readonly uiam: UiamServicePublic;

  constructor({ logger, uiam }: UiamSystemIdentityOptions) {
    this.logger = logger;
    this.uiam = uiam;
  }

  async createEphemeralToken(signal?: AbortSignal): Promise<string> {
    // UIAM call failures are logged (status only) by the UIAM service and propagate unchanged.
    const response = await this.uiam.authenticateAsKibana(signal);

    const parsed = kibanaAuthenticateResponseSchema.safeParse(response);
    if (!parsed.success) {
      this.logger.error(
        `UIAM authentication response for Kibana's system identity failed validation: ${parsed.error.message}`
      );
      throw new Error(
        'UIAM did not return a properly formatted project service account token for Kibana.'
      );
    }

    return parsed.data.token;
  }
}
