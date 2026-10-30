/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { SourceEnvironment } from './source_helpers';

export type SourceEnvironmentLoader = () => Promise<SourceEnvironment>;

export const createSourceEnvironmentLoader =
  ({
    cloud,
    isServerless,
    managedOtlpPrwEndpointEnabled,
  }: {
    cloud?: CloudStart;
    isServerless: boolean;
    managedOtlpPrwEndpointEnabled: boolean;
  }): SourceEnvironmentLoader =>
  async () => {
    let elasticsearchBaseUrl: string | undefined;
    try {
      elasticsearchBaseUrl = (await cloud?.fetchElasticsearchConfig())?.elasticsearchUrl;
    } catch {
      elasticsearchBaseUrl = undefined;
    }

    return {
      managedInputBaseUrl: cloud?.managedOtlp?.url,
      elasticsearchBaseUrl,
      isCloudEnabled: cloud?.isCloudEnabled ?? false,
      isServerless,
      managedOtlpPrwEndpointEnabled,
    };
  };
