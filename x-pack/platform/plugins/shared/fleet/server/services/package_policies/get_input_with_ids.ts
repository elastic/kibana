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
 * overrides (`input.config`, `stream.config`, and `overrides.inputs`),
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
 * merges over the base input/stream id when building the full agent policy.
 * These replace the validated base id on the Agent-facing policy, so they must
 * be checked on create/update too. The sources are:
 * - `input.config`, deep-merged into the full input (its `id` and `streams[*].id`)
 * - `stream.config`, spread over the full stream (its `id`)
 * - `overrides.inputs[*]`, deep-merged into the full input (its `id` and `streams[*].id`)
 */
function validateNoTraversalInIdOverrides(packagePolicy: NewPackagePolicy): void {
  for (const input of packagePolicy.inputs) {
    validateNoTraversalInInputIdentity({
      id: input.config?.id?.value,
      streams: input.config?.streams?.value,
    });
    for (const stream of input.streams ?? []) {
      validateNoPathTraversalId(stream.config?.id?.value);
    }
  }

  const overrideInputs = packagePolicy.overrides?.inputs;
  if (overrideInputs) {
    for (const override of Object.values(overrideInputs)) {
      validateNoTraversalInInputIdentity(override);
    }
  }
}

/**
 * Validates the identity fields of a value that is merged into a full agent
 * input: its own `id` and the `id` of each entry in `streams`. Only these two
 * land on the fields Agent uses as filesystem path segments (`input.id` and
 * `stream.id`); any other nested `id` (e.g. an event-data
 * `processors[].add_fields.fields.id`) is not an input/stream identifier, so
 * it is deliberately not validated.
 *
 * `streams` is walked whether it is an array or an object: lodash `merge`
 * applies an object with numeric keys onto the base streams array by index.
 */
function validateNoTraversalInInputIdentity(value: unknown): void {
  if (!value || typeof value !== 'object') {
    return;
  }
  const { id, streams } = value as { id?: unknown; streams?: unknown };
  validateNoPathTraversalId(id);

  if (streams && typeof streams === 'object') {
    for (const stream of Object.values(streams)) {
      if (stream && typeof stream === 'object') {
        validateNoPathTraversalId((stream as { id?: unknown }).id);
      }
    }
  }
}

/**
 * Validates the ids that package templates compile into `compiled_input` and
 * `compiled_stream`. `storedPackagePolicyToAgentInputs` spreads both over the
 * validated input/stream id, so a root-level `id` in the compiled output (for
 * example from a user-supplied `yaml` variable such as "Custom configurations")
 * would otherwise reach Agent. Call this after compiling, on create/update paths
 * only: it throws, so it must not run when recompiling stored policies to
 * generate the agent policy.
 *
 * Only string ids are checked: a non-string value cannot form a path segment,
 * and templates are free to emit other `id` types.
 */
export function validateNoTraversalInCompiledIds(inputs: PackagePolicy['inputs']): void {
  const validateIfString = (id: unknown) => {
    if (typeof id === 'string') {
      validateNoPathTraversalId(id);
    }
  };

  for (const input of inputs) {
    validateIfString(input.compiled_input?.id);
    const compiledInputStreams = input.compiled_input?.streams;
    if (compiledInputStreams && typeof compiledInputStreams === 'object') {
      for (const stream of Object.values(compiledInputStreams)) {
        validateIfString((stream as { id?: unknown } | null)?.id);
      }
    }
    for (const stream of input.streams ?? []) {
      validateIfString(stream.compiled_stream?.id);
    }
  }
}
