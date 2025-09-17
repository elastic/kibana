/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type { PreconfiguredInputs } from '../../../common/types';
import type { PackagePolicy } from '../../types';
import { packagePolicyService } from '../package_policy';

import { isDifferent } from './utils';

export function packagePolicyHasFrozenVariablesUpdate(
  existingPackagePolicy: PackagePolicy,
  preconfiguredInputs: PreconfiguredInputs[]
) {
  for (const preconfiguredInput of preconfiguredInputs) {
    const currentInput = existingPackagePolicy.inputs.find(
      (existingInput) => existingInput.type === preconfiguredInput.type
    );
    if (!currentInput) {
      continue;
    }
    for (const preconfiguredInputVar of preconfiguredInput.vars ?? []) {
      const currentVar = currentInput?.vars
        ? currentInput.vars[preconfiguredInputVar.name]
        : undefined;
      if (
        preconfiguredInputVar.frozen &&
        currentVar &&
        isDifferent(currentVar.value, preconfiguredInputVar.value)
      ) {
        return true;
      }
    }

    for (const stream of preconfiguredInput.streams ?? []) {
      if (!stream.vars) {
        continue;
      }
      for (const preconfiguredStreamVar of stream.vars ?? []) {
        const currentStream = currentInput?.streams?.find(
          (s) =>
            s.data_stream.dataset === stream.data_stream.dataset &&
            s.data_stream.type === stream.data_stream.type
        );

        const currentVar = currentStream?.vars
          ? currentStream.vars[preconfiguredStreamVar.name]
          : undefined;
        if (
          preconfiguredStreamVar.frozen &&
          currentVar &&
          isDifferent(currentVar?.value, preconfiguredStreamVar.value)
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

export async function updateFrozenInputs(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  packagePolicy: PackagePolicy,
  inputs: PreconfiguredInputs[]
) {
  if (!packagePolicy.package) {
    //  We do not support package policies without package
    return;
  }

  const updatePackagePolicy = { ...packagePolicy };

  for (const input of inputs) {
    const inputToUpdate = updatePackagePolicy.inputs.find((i) => i.type === input.type);
    if (!inputToUpdate) {
      continue;
    }
    for (const inputVar of input.vars ?? []) {
      const varToUpdate = inputToUpdate.vars ? inputToUpdate.vars[inputVar.name] : undefined;
      if (inputVar.frozen && varToUpdate && isDifferent(varToUpdate.value, inputVar.value)) {
        varToUpdate.value = inputVar.value;
      }
    }
    for (const stream of input.streams ?? []) {
      const streamToUpdate = inputToUpdate.streams?.find(
        (s) =>
          s.data_stream.dataset === stream.data_stream.dataset &&
          s.data_stream.type === stream.data_stream.type
      );
      if (!streamToUpdate) {
        continue;
      }

      for (const streamVar of stream.vars ?? []) {
        const varToUpdate = streamToUpdate.vars ? streamToUpdate.vars[streamVar.name] : undefined;
        if (streamVar.frozen && varToUpdate && varToUpdate.value !== streamVar.value) {
          varToUpdate.value = streamVar.value;
        }
      }
    }
  }

  await packagePolicyService.update(soClient, esClient, packagePolicy.id, updatePackagePolicy, {
    force: true,
    bumpRevision: false,
  });
}
