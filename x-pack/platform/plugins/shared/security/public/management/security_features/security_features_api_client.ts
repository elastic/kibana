/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';

export interface CheckSecurityFeaturesResponse {
  canReadSecurity: boolean;
  canUseInlineScripts: boolean;
  canUseStoredScripts: boolean;
  hasCompatibleRealms: boolean;
  canUseRemoteIndices: boolean;
  canUseRemoteClusters: boolean;
}

export class SecurityFeaturesAPIClient {
  constructor(private readonly http: HttpStart) {}

  public async checkFeatures(): Promise<CheckSecurityFeaturesResponse> {
    return this.http.get(`/internal/security/_check_security_features`);
  }
}
