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

type PromiseValues<T> = {
  [Key in keyof T]: Promise<T[Key]>;
};

const resolveValues = async <T>(promiseObject: PromiseValues<T>): Promise<T> => {
  const entries = await Promise.all(
    Object.entries(promiseObject).map(async ([key, promise]) => [key, await promise])
  );
  return Object.fromEntries(entries);
};

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

  private async hasRequiredLicense() {
    const license = await firstValueFrom(this.licensing.license$);
    return license.hasAtLeast('standard');
  }

  private async hasLlmConnector() {
    const connectors = await this.inference.getConnectors();
    return connectors.length > 0;
  }

  public async checkAccess(): Promise<AgentBuilderAccess> {
    const accessPromise: PromiseValues<AgentBuilderAccess> = {
      hasRequiredLicense: this.hasRequiredLicense(),
      hasLlmConnector: this.hasLlmConnector(),
    };

    const access = await resolveValues(accessPromise);

    return access;
  }
}
