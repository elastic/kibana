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
 * rejects path-traversal sequences here. This also covers the effective id
 * overrides (`input.config.id`, `stream.config.id`, and `overrides.inputs`),
 * which `storedPackagePolicyToAgentInputs` merges over the base id when
 * generating the full agent policy — otherwise a safe base id plus a traversal
 * override would bypass the check. Callers that operate on already-stored
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

  if (validateIds) {
    validateNoTraversalInIdOverrides(packagePolicy);
  }

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

/**
 * Validates the id override values that `storedPackagePolicyToAgentInputs`
 * merges over the base input/stream id when building the full agent policy:
 * `input.config.id.value`, `stream.config.id.value`, and the ids inside
 * `overrides.inputs[*]`. These replace the validated base id on the
 * Agent-facing policy, so they must be checked on create/update too.
 *
 * `overrides.inputs[*]` is `deepMerge`d wholesale into the full input, so an
 * `id` nested anywhere in the override (top-level or in `streams[*].id`) can
 * reach Agent. The override body is schema-typed as `any`, so walk it and
 * validate every `id` property regardless of depth.
 */
function validateNoTraversalInIdOverrides(packagePolicy: NewPackagePolicy): void {
  for (const input of packagePolicy.inputs) {
    validateNoPathTraversalId(input.config?.id?.value);
    for (const stream of input.streams ?? []) {
      validateNoPathTraversalId(stream.config?.id?.value);
    }
  }

  const overrideInputs = packagePolicy.overrides?.inputs;
  if (overrideInputs) {
    for (const override of Object.values(overrideInputs)) {
      validateNoTraversalInIdFields(override);
    }
  }
}

/**
 * Recursively validates every `id` property found within an arbitrary override
 * value (object or array). Used for `overrides.inputs[*]`, whose shape is not
 * constrained by the schema and is deep-merged into the full agent input.
 */
function validateNoTraversalInIdFields(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      validateNoTraversalInIdFields(item);
    }
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (key === 'id') {
        validateNoPathTraversalId(nested);
      }
      validateNoTraversalInIdFields(nested);
    }
  }
}
