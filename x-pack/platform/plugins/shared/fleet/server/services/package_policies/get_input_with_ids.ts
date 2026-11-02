/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy, PackageInfo, PackagePolicy } from '../../types';
import { getInputId } from '../agent_policies/package_policies_to_agent_inputs';
import { getInputEffectiveName, validateNoPathTraversalId } from '../../../common/services';
import { FLEET_ENDPOINT_PACKAGE } from '../../../common/constants/epm';

/**
 * Populate the ids for inputs and streams of a package policy if they are not already set
 *
 * the option `allEnabled` is only used to generate inputs integration templates where everything is enabled by default
 * it shouldn't be used in the normal install flow
 *
 * Client-supplied input and stream ids are used verbatim as filesystem path
 * segments by Elastic Agent for isolated-unit components, so `validateIds`
 * rejects path-traversal sequences here. Callers that operate on already-stored
 * package policies (e.g. the input-id backport setup task) pass `false` so a
 * pre-existing id cannot make them throw.
 */
export function getInputsWithIds(
  packagePolicy: NewPackagePolicy,
  packagePolicyId?: string,
  allEnabled?: boolean,
  packageInfo?: PackageInfo,
  validateIds: boolean = true
): PackagePolicy['inputs'] {
  const packageName = packageInfo?.name ?? packagePolicy.package?.name;
  const isEndpointPackage = packageName === FLEET_ENDPOINT_PACKAGE;

  return packagePolicy.inputs.map((input) => {
    const inputId =
      isEndpointPackage && packagePolicyId
        ? packagePolicyId
        : input.id
        ? input.id
        : getInputId(input, packagePolicyId, packageInfo);

    if (validateIds) {
      validateNoPathTraversalId(inputId);
    }

    return {
      ...input,
      id: inputId,
      enabled: !!allEnabled ? true : input.enabled,
      streams: input.streams.map((stream) => {
        const streamId = stream?.id
          ? stream.id
          : packagePolicyId
          ? `${getInputEffectiveName(input)}-${stream.data_stream.dataset}-${packagePolicyId}`
          : `${getInputEffectiveName(input)}-${stream.data_stream.dataset}`;

        if (validateIds) {
          validateNoPathTraversalId(streamId);
        }

        return {
          ...stream,
          enabled: !!allEnabled ? true : stream.enabled,
          id: streamId,
        };
      }),
    };
  });
}
