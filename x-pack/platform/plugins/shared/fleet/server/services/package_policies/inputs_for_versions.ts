/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicyInput, PackagePolicySOAttributes } from '../../types';

/**
 * Version of the agent version condition evaluation that `inputs_for_versions` entries are
 * compiled with. Bump it whenever that evaluation changes (see `agentVersionSatisfiesCondition`),
 * so entries compiled by a previous Kibana version are recompiled instead of being reused.
 *
 * Entries without a version were compiled before versions were recorded, when a `major.minor`
 * variant was evaluated at `major.minor.0`.
 */
export const INPUTS_FOR_VERSIONS_COMPILER_VERSION = 1;

type InputsForVersionsAttributes = Pick<
  PackagePolicySOAttributes,
  'inputs_for_versions' | 'inputs_for_versions_compiler_versions'
>;

/** The `inputs_for_versions` entry of `agentVersion`, unless it is missing or outdated. */
export function getCurrentInputsForVersion(
  attributes: InputsForVersionsAttributes | undefined,
  agentVersion: string
): PackagePolicyInput[] | undefined {
  return attributes?.inputs_for_versions_compiler_versions?.[agentVersion] ===
    INPUTS_FOR_VERSIONS_COMPILER_VERSION
    ? attributes.inputs_for_versions?.[agentVersion]
    : undefined;
}

/**
 * The `inputs_for_versions` and `inputs_for_versions_compiler_versions` attributes after storing
 * `compiledInputsForVersions`, which were compiled with the current version.
 */
export function withCompiledInputsForVersions(
  attributes: InputsForVersionsAttributes | undefined,
  compiledInputsForVersions: Record<string, PackagePolicyInput[]>
): Required<InputsForVersionsAttributes> {
  const compilerVersions = { ...attributes?.inputs_for_versions_compiler_versions };
  for (const version of Object.keys(compiledInputsForVersions)) {
    compilerVersions[version] = INPUTS_FOR_VERSIONS_COMPILER_VERSION;
  }
  return {
    inputs_for_versions: { ...attributes?.inputs_for_versions, ...compiledInputsForVersions },
    inputs_for_versions_compiler_versions: compilerVersions,
  };
}
