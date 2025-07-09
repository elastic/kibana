/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OTelCollectorConfig } from "../../../common/types/models";
import type { GlobalDataTag } from '../../../common/types';
import type {
  PackagePolicy,
  PackageInfo,
} from '../../types';
import { OTEL_COLLECTOR_INPUT_TYPE } from "../../../common/constants/otelcol";

export const storedPackagePoliciesToOtelCollectorConfig = async (
    packagePolicies: PackagePolicy[],
    packageInfoCache: Map<string, PackageInfo>,
    agentPolicyOutputId: string, namespace: string,
    globalDataTags: GlobalDataTag[],
 ): Promise<OTelCollectorConfig> {
  
  const config: OTelCollectorConfig = {};

  packagePolicies.forEach((packagePolicy) => {
    packagePolicy.inputs.forEach((input) => {
      if (!input.enabled) {
        return;
      }

      // otelcol is a convenience input name that indicates that the input must be resolved as OTel Collector configuration.
      // Here we are only interested in otelcol inputs.
      if (input.type !== OTEL_COLLECTOR_INPUT_TYPE) {
        return;
      }

      throw new Error('Function not implemented.');
    });
  })

  return config;
}