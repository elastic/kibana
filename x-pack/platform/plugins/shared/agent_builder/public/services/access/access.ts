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
  /**
   * Informational UI gate only. Security boundaries for deanonymization are
   * enforced server-side by anonymization replacements API privileges.
   */
  hasAnonymizationEnabled: boolean;
}

export class AgentBuilderAccessChecker {
  private readonly licensing: LicensingPluginStart;
  private readonly inference: InferencePublicStart;
  private access: AgentBuilderAccess | null = null;

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

  private async hasRequiredLicense() {
    const license = await firstValueFrom(this.licensing.license$);
    return license.hasAtLeast('enterprise') && license.isActive;
  }

  private async getInferenceAccess() {
    const { connectors, anonymizationEnabled } = await this.inference.getConnectors();
    return {
      hasLlmConnector: connectors.length > 0,
      hasAnonymizationEnabled: anonymizationEnabled,
    };
  }

  public async initAccess() {
    if (this.access !== null) {
      return;
    }

    try {
      const [{ hasLlmConnector, hasAnonymizationEnabled }, hasRequiredLicense] = await Promise.all([
        this.getInferenceAccess(),
        this.hasRequiredLicense(),
      ]);

      this.access = {
        hasRequiredLicense,
        hasLlmConnector,
        hasAnonymizationEnabled,
      };
    } catch (error) {
      throw new Error('Unable to determine Agent Builder access', { cause: error });
    }
  }

  public getAccess() {
    if (!this.access) {
      throw new Error('Agent Builder access was not initialized');
    }
    return this.access;
  }
}
