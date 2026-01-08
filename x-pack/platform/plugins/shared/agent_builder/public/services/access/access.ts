/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferencePublicStart } from '@kbn/inference-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { firstValueFrom } from 'rxjs';

export interface AgentBuilderAccess {
  hasRequiredLicense: boolean;
  hasLlmConnector: boolean;
}

export class AgentBuilderAccessChecker {
  private readonly licensing: LicensingPluginStart;
  private readonly inference: InferencePublicStart;

  constructor({
    licensing,
    inference,
  }: {
    licensing: LicensingPluginStart;
    inference: InferencePublicStart;
  }) {
    this.licensing = licensing;
    this.inference = inference;
  }

  private async hasRequiredLicense(): Promise<boolean> {
    const license = await firstValueFrom(this.licensing.license$);
    return license.hasAtLeast('enterprise') && license.isActive;
  }

  private async hasLlmConnector(): Promise<boolean> {
    const connectors = await this.inference.getConnectors();
    return connectors.length > 0;
  }

  /**
   * Fetches the current access state.
   * This method fetches fresh data each time it's called to ensure
   * the access state reflects the current state (e.g., newly created connectors).
   */
  public async getAccess(): Promise<AgentBuilderAccess> {
    const [hasRequiredLicense, hasLlmConnector] = await Promise.all([
      this.hasRequiredLicense(),
      this.hasLlmConnector(),
    ]);

    return {
      hasRequiredLicense,
      hasLlmConnector,
    };
  }
}
