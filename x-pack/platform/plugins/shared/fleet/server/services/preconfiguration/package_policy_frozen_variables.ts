/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type {
  PackagePolicyConfigRecord,
  PackagePolicyConfigRecordEntry,
  PreconfiguredInputs,
  PreconfiguredVar,
} from '../../../common/types';
import type { PackagePolicy } from '../../types';
import { packagePolicyService } from '../package_policy';

import { isDifferent } from './utils';

function isFrozenAndDifferent(
  preconfiguredVar: PreconfiguredVar,
  existingVar?: PackagePolicyConfigRecordEntry
): existingVar is PackagePolicyConfigRecordEntry {
  return (
    (preconfiguredVar?.frozen ?? false) &&
    existingVar !== undefined &&
    (isDifferent(existingVar.value, preconfiguredVar.value) ||
      isDifferent(existingVar.frozen, preconfiguredVar.frozen))
  );
}

function updateFrozenVars(
  preconfiguredVars: PreconfiguredVar[],
  currentVars?: PackagePolicyConfigRecord
) {
  for (const inputVar of preconfiguredVars) {
    const varToUpdate = currentVars ? currentVars[inputVar.name] : undefined;
    if (isFrozenAndDifferent(inputVar, varToUpdate)) {
      varToUpdate.value = inputVar.value;
      varToUpdate.frozen = inputVar.frozen;
    }
  }
}

function frozenVarsAreDifferent(
  preconfiguredVars: PreconfiguredVar[],
  currentVars?: PackagePolicyConfigRecord
) {
  for (const preconfiguredInputVar of preconfiguredVars) {
    const currentVar = currentVars ? currentVars[preconfiguredInputVar.name] : undefined;
    if (isFrozenAndDifferent(preconfiguredInputVar, currentVar)) {
      return true;
    }
  }
}

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
    if (frozenVarsAreDifferent(preconfiguredInput.vars ?? [], currentInput.vars)) {
      return true;
    }

    for (const preconfiguredStream of preconfiguredInput.streams ?? []) {
      const currentStream = currentInput?.streams?.find(
        (s) =>
          s.data_stream.dataset === preconfiguredStream.data_stream.dataset &&
          s.data_stream.type === preconfiguredStream.data_stream.type
      );

      if (!currentStream) {
        continue;
      }

      if (frozenVarsAreDifferent(preconfiguredStream.vars ?? [], currentStream.vars)) {
        return true;
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
    updateFrozenVars(input.vars ?? [], inputToUpdate.vars);
    for (const stream of input.streams ?? []) {
      const streamToUpdate = inputToUpdate.streams?.find(
        (s) =>
          s.data_stream.dataset === stream.data_stream.dataset &&
          s.data_stream.type === stream.data_stream.type
      );
      if (!streamToUpdate) {
        continue;
      }

      updateFrozenVars(stream.vars ?? [], streamToUpdate.vars);
    }
  }

  await packagePolicyService.update(soClient, esClient, packagePolicy.id, updatePackagePolicy, {
    force: true,
    bumpRevision: false,
  });
}
