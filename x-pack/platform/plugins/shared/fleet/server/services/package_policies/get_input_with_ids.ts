/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy, PackageInfo, PackagePolicy } from '../../types';
import { getInputId } from '../agent_policies/package_policies_to_agent_inputs';

/**
 * Populate the ids for inputs and streams of a package policy if they are not already set
 *
 * the option `allEnabled` is only used to generate inputs integration templates where everything is enabled by default
 * it shouldn't be used in the normal install flow
 */
export function getInputsWithIds(
  packagePolicy: NewPackagePolicy,
  packagePolicyId?: string,
  allEnabled?: boolean,
  packageInfo?: PackageInfo
): PackagePolicy['inputs'] {
  return packagePolicy.inputs.map((input) => {
    const inputId = input.id ? input.id : getInputId(input, packagePolicyId, packageInfo);

    return {
      ...input,
      id: inputId,
      enabled: !!allEnabled ? true : input.enabled,
      streams: input.streams.map((stream) => ({
        ...stream,
        enabled: !!allEnabled ? true : stream.enabled,
        id: stream?.id
          ? stream.id
          : packagePolicyId
          ? `${input.type}-${stream.data_stream.dataset}-${packagePolicyId}`
          : `${input.type}-${stream.data_stream.dataset}`,
      })),
    };
  });
}
