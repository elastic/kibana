/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { keyBy } from 'lodash';

import { packageHasNoPolicyTemplates } from '../../../common/services/policy_template';
import type { NewPackagePolicy, RegistryStream, UpdatePackagePolicy } from '../../../common';
import { SO_SEARCH_LIMIT } from '../../../common';
import {
  doesPackageHaveIntegrations,
  getNormalizedDataStreams,
  getNormalizedInputs,
} from '../../../common/services';
import type {
  PackageInfo,
  PackagePolicy,
  RegistryVarsEntry,
  Secret,
  VarSecretReference,
  SecretReference,
  SecretPath,
} from '../../types';
import { appContextService } from '../app_context';
import { packagePolicyService } from '../package_policy';

import { createSecrets, deleteSecrets } from './common';

/**
 * Given a new package policy, extracts any secrets, creates them in Elasticsearch,
 * and returns a new package policy with secret references in place of the
 * original secret values, along with an array of secret references for
 * storage on the package policy object itself.
 */
export async function extractAndWriteSecrets(opts: {
  packagePolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
  esClient: ElasticsearchClient;
}): Promise<{ packagePolicy: NewPackagePolicy; secretReferences: SecretReference[] }> {
  const { packagePolicy, packageInfo, esClient } = opts;
  const secretPaths = getPolicySecretPaths(packagePolicy, packageInfo);
  const cloudConnectorsSecretReferences =
    packagePolicy.supports_cloud_connector && packagePolicy.cloud_connector_id
      ? getCloudConnectorSecretReferences(packagePolicy, secretPaths)
      : [];

  if (!secretPaths.length) {
    return { packagePolicy, secretReferences: [] };
  }

  const secretsToCreate = secretPaths.filter(
    (secretPath) => !!secretPath.value.value && !secretPath.value.value.isSecretRef
  );

  const hasCloudConnectorSecretReferences =
    packagePolicy.supports_cloud_connector &&
    packagePolicy.cloud_connector_id &&
    cloudConnectorsSecretReferences.length;

  if (hasCloudConnectorSecretReferences) {
    return { packagePolicy, secretReferences: cloudConnectorsSecretReferences };
  }

  const secrets = await createSecrets({
    esClient,
    values: secretsToCreate.map((secretPath) => secretPath.value.value),
  });

  const policyWithSecretRefs = getPolicyWithSecretReferences(
    secretsToCreate,
    secrets,
    packagePolicy
  );

  return {
    packagePolicy: policyWithSecretRefs,
    secretReferences: [
      ...secrets.reduce((acc: SecretReference[], secret) => {
        if (Array.isArray(secret)) {
          return [...acc, ...secret.map(({ id }) => ({ id }))];
        }
        return [...acc, { id: secret.id }];
      }, []),
    ],
  };
}

/**
 * Given a package policy update, extracts any secrets, creates them in Elasticsearch,
 * and returns a package policy update with secret references in place of the
 * original secret values, along with an array of secret references for
 * storage on the package policy object itself.
 */
export async function extractAndUpdateSecrets(opts: {
  oldPackagePolicy: PackagePolicy;
  packagePolicyUpdate: UpdatePackagePolicy;
  packageInfo: PackageInfo;
  esClient: ElasticsearchClient;
}): Promise<{
  packagePolicyUpdate: UpdatePackagePolicy;
  secretReferences: SecretReference[];
  secretsToDelete: SecretReference[];
}> {
  const { oldPackagePolicy, packagePolicyUpdate, packageInfo, esClient } = opts;
  const oldSecretPaths = getPolicySecretPaths(oldPackagePolicy, packageInfo);
  const updatedSecretPaths = getPolicySecretPaths(packagePolicyUpdate, packageInfo);

  if (!oldSecretPaths.length && !updatedSecretPaths.length) {
    return { packagePolicyUpdate, secretReferences: [], secretsToDelete: [] };
  }

  const { toCreate, toDelete, noChange } = diffSecretPaths(oldSecretPaths, updatedSecretPaths);

  const secretsToCreate = toCreate.filter((secretPath) => !!secretPath.value.value);

  const createdSecrets = await createSecrets({
    esClient,
    values: secretsToCreate.map((secretPath) => secretPath.value.value),
  });

  const policyWithSecretRefs = getPolicyWithSecretReferences(
    secretsToCreate,
    createdSecrets,
    packagePolicyUpdate
  );

  const secretReferences = [
    ...noChange.reduce((acc: SecretReference[], secretPath) => {
      if (secretPath.value.value.ids) {
        return [...acc, ...secretPath.value.value.ids.map((id: string) => ({ id }))];
      }
      return [...acc, { id: secretPath.value.value.id }];
    }, []),
    ...createdSecrets.reduce((acc: SecretReference[], secret) => {
      if (Array.isArray(secret)) {
        return [...acc, ...secret.map(({ id }) => ({ id }))];
      }
      return [...acc, { id: secret.id }];
    }, []),
  ];

  const secretsToDelete: SecretReference[] = [];

  toDelete.forEach((secretPath) => {
    // check if the previous secret is actually a secret refrerence
    // it may be that secrets were not enabled at the time of creation
    // in which case they are just stored as plain text
    if (secretPath.value.value?.isSecretRef) {
      if (secretPath.value.value.ids) {
        secretPath.value.value.ids.forEach((id: string) => {
          secretsToDelete.push({ id });
        });
      } else {
        secretsToDelete.push({ id: secretPath.value.value.id });
      }
    }
  });

  return {
    packagePolicyUpdate: policyWithSecretRefs,
    secretReferences,
    secretsToDelete,
  };
}

/**
 * Given a list of secret ids, checks to see if they are still referenced by any
 * package policies, and if not, deletes them.
 */
export async function deleteSecretsIfNotReferenced(opts: {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  ids: string[];
}): Promise<void> {
  const { esClient, soClient, ids } = opts;
  const logger = appContextService.getLogger();
  const packagePoliciesUsingSecrets = await findPackagePoliciesUsingSecrets({
    soClient,
    ids,
  });

  if (packagePoliciesUsingSecrets.length) {
    packagePoliciesUsingSecrets.forEach(({ id, policyIds }) => {
      logger.debug(
        `Not deleting secret with id ${id} is still in use by package policies: ${policyIds.join(
          ', '
        )}`
      );
    });
  }

  const secretsToDelete = ids.filter((id) => {
    return !packagePoliciesUsingSecrets.some((packagePolicy) => packagePolicy.id === id);
  });

  if (!secretsToDelete.length) {
    return;
  }
  try {
    await deleteSecrets({
      esClient,
      ids: secretsToDelete,
    });
  } catch (e) {
    logger.warn(`Error cleaning up secrets ${ids.join(', ')}: ${e}`);
  }
}

// Utility functions, exported for testing

export async function findPackagePoliciesUsingSecrets(opts: {
  soClient: SavedObjectsClientContract;
  ids: string[];
}): Promise<Array<{ id: string; policyIds: string[] }>> {
  const { soClient, ids } = opts;
  const packagePolicies = await packagePolicyService.list(soClient, {
    kuery: `ingest-package-policies.secret_references.id: (${ids.join(' or ')})`,
    perPage: SO_SEARCH_LIMIT,
    page: 1,
  });

  if (!packagePolicies.total) {
    return [];
  }

  // create a map of secret_references.id to package policy id
  const packagePoliciesBySecretId = packagePolicies.items.reduce((acc, packagePolicy) => {
    packagePolicy?.secret_references?.forEach((secretReference) => {
      if (Array.isArray(secretReference)) {
        secretReference.forEach(({ id }) => {
          if (!acc[id]) {
            acc[id] = [];
          }
          acc[id].push(packagePolicy.id);
        });
      } else {
        if (!acc[secretReference.id]) {
          acc[secretReference.id] = [];
        }
        acc[secretReference.id].push(packagePolicy.id);
      }
    });
    return acc;
  }, {} as Record<string, string[]>);

  const res = [];

  for (const id of ids) {
    if (packagePoliciesBySecretId[id]) {
      res.push({
        id,
        policyIds: packagePoliciesBySecretId[id],
      });
    }
  }

  return res;
}

export function diffSecretPaths(
  oldPaths: SecretPath[],
  newPaths: SecretPath[]
): { toCreate: SecretPath[]; toDelete: SecretPath[]; noChange: SecretPath[] } {
  const toCreate: SecretPath[] = [];
  const toDelete: SecretPath[] = [];
  const noChange: SecretPath[] = [];
  const newPathsByPath = keyBy(newPaths, (x) => x.path.join('.'));

  for (const oldPath of oldPaths) {
    if (!newPathsByPath[oldPath.path.join('.')]) {
      toDelete.push(oldPath);
    }

    const newPath = newPathsByPath[oldPath.path.join('.')];
    if (newPath && newPath.value.value) {
      const newValue = newPath.value?.value;
      if (!newValue?.isSecretRef) {
        toCreate.push(newPath);
        toDelete.push(oldPath);
      } else {
        noChange.push(newPath);
      }
      delete newPathsByPath[oldPath.path.join('.')];
    }
  }

  const remainingNewPaths = Object.values(newPathsByPath);

  return { toCreate: [...toCreate, ...remainingNewPaths], toDelete, noChange };
}

/**
 * Given a package policy and a package,
 * returns an array of lodash style paths to all secrets and their current values.
 */
export function getPolicySecretPaths(
  packagePolicy: PackagePolicy | NewPackagePolicy | UpdatePackagePolicy,
  packageInfo: PackageInfo
): SecretPath[] {
  const packageLevelVarPaths = _getPackageLevelSecretPaths(packagePolicy, packageInfo);

  if (!packageInfo?.policy_templates?.length || packageHasNoPolicyTemplates(packageInfo)) {
    return packageLevelVarPaths;
  }

  const inputSecretPaths = _getInputSecretPaths(packagePolicy, packageInfo);

  return [...packageLevelVarPaths, ...inputSecretPaths];
}

// Other utility functions

function isSecretVar(varDef: RegistryVarsEntry) {
  return varDef.secret === true;
}

function containsSecretVar(vars?: RegistryVarsEntry[]) {
  return vars?.some(isSecretVar);
}

function _getPackageLevelSecretPaths(
  packagePolicy: NewPackagePolicy,
  packageInfo: PackageInfo
): SecretPath[] {
  const packageSecretVars = packageInfo.vars?.filter(isSecretVar) || [];
  const packageSecretVarsByName = keyBy(packageSecretVars, 'name');
  const packageVars = Object.entries(packagePolicy.vars || {});

  return packageVars.reduce((vars, [name, configEntry], i) => {
    if (packageSecretVarsByName[name]) {
      vars.push({
        value: configEntry,
        path: ['vars', name],
      });
    }
    return vars;
  }, [] as SecretPath[]);
}

function _getInputSecretPaths(
  packagePolicy: NewPackagePolicy,
  packageInfo: PackageInfo
): SecretPath[] {
  if (!packageInfo?.policy_templates?.length) return [];

  const inputSecretVarDefsByPolicyTemplateAndType =
    _getInputSecretVarDefsByPolicyTemplateAndType(packageInfo);

  const streamSecretVarDefsByDatasetAndInput =
    _getStreamSecretVarDefsByDatasetAndInput(packageInfo);

  return packagePolicy.inputs.flatMap((input, inputIndex) => {
    if (!input.vars && !input.streams) {
      return [];
    }
    const currentInputVarPaths: SecretPath[] = [];
    const inputKey = doesPackageHaveIntegrations(packageInfo)
      ? `${input.policy_template}-${input.type}`
      : input.type;
    const inputVars = Object.entries(input.vars || {});
    if (inputVars.length) {
      inputVars.forEach(([name, configEntry]) => {
        if (inputSecretVarDefsByPolicyTemplateAndType[inputKey]?.[name]) {
          currentInputVarPaths.push({
            path: ['inputs', inputIndex.toString(), 'vars', name],
            value: configEntry,
          });
        }
      });
    }

    if (input.streams.length) {
      input.streams.forEach((stream, streamIndex) => {
        const streamVarDefs =
          streamSecretVarDefsByDatasetAndInput[`${stream.data_stream.dataset}-${input.type}`];
        if (streamVarDefs && Object.keys(streamVarDefs).length) {
          Object.entries(stream.vars || {}).forEach(([name, configEntry]) => {
            if (streamVarDefs[name]) {
              currentInputVarPaths.push({
                path: [
                  'inputs',
                  inputIndex.toString(),
                  'streams',
                  streamIndex.toString(),
                  'vars',
                  name,
                ],
                value: configEntry,
              });
            }
          });
        }
      });
    }

    return currentInputVarPaths;
  });
}

// a map of all secret vars for each policyTemplate and input type combo
function _getInputSecretVarDefsByPolicyTemplateAndType(packageInfo: PackageInfo) {
  if (!packageInfo?.policy_templates?.length) return {};

  const hasIntegrations = doesPackageHaveIntegrations(packageInfo);
  return packageInfo.policy_templates.reduce<Record<string, Record<string, RegistryVarsEntry>>>(
    (varDefs, policyTemplate) => {
      const inputs = getNormalizedInputs(policyTemplate);
      inputs.forEach((input) => {
        const varDefKey = hasIntegrations ? `${policyTemplate.name}-${input.type}` : input.type;
        const secretVars = input?.vars?.filter(isSecretVar);
        if (secretVars?.length) {
          varDefs[varDefKey] = keyBy(secretVars, 'name');
        }
      });
      return varDefs;
    },
    {}
  );
}

// a map of all secret vars for each dataset and input combo
function _getStreamSecretVarDefsByDatasetAndInput(packageInfo: PackageInfo) {
  const dataStreams = getNormalizedDataStreams(packageInfo);
  const streamsByDatasetAndInput = dataStreams.reduce<Record<string, RegistryStream>>(
    (streams, dataStream) => {
      dataStream.streams?.forEach((stream) => {
        streams[`${dataStream.dataset}-${stream.input}`] = stream;
      });
      return streams;
    },
    {}
  );

  return Object.entries(streamsByDatasetAndInput).reduce<
    Record<string, Record<string, RegistryVarsEntry>>
  >((varDefs, [path, stream]) => {
    if (stream.vars && containsSecretVar(stream.vars)) {
      const secretVars = stream.vars.filter(isSecretVar);
      varDefs[path] = keyBy(secretVars, 'name');
    }
    return varDefs;
  }, {});
}

/**
 * Given an array of secret paths, existing secrets, and a package policy, generates a
 * new package policy object that includes resolved secret reference values at each
 * provided path.
 */
function getPolicyWithSecretReferences(
  secretPaths: SecretPath[],
  secrets: Array<Secret | Secret[]>,
  packagePolicy: NewPackagePolicy
) {
  const result = JSON.parse(JSON.stringify(packagePolicy));

  secretPaths.forEach((secretPath, secretPathIndex) => {
    secretPath.path.reduce((acc, val, secretPathComponentIndex) => {
      if (!acc[val]) {
        acc[val] = {};
      }

      const isLast = secretPathComponentIndex === secretPath.path.length - 1;

      if (isLast) {
        acc[val].value = toVarSecretRef(secrets[secretPathIndex]);
      }

      return acc[val];
    }, result);
  });

  return result;
}

// this is how secrets are stored on the package policy
function toVarSecretRef(secret: Secret | Secret[]): VarSecretReference {
  if (Array.isArray(secret)) {
    return { ids: secret.map(({ id }) => id), isSecretRef: true };
  }
  return { id: secret.id, isSecretRef: true };
}

function getCloudConnectorSecretReferences(
  packagePolicy: NewPackagePolicy,
  secretPaths: SecretPath[]
): SecretReference[] {
  // For cloud connectors, we need to find secret paths that are already secret references
  if (!packagePolicy?.supports_cloud_connector || !packagePolicy.cloud_connector_id) {
    return [];
  }
  return secretPaths
    .filter(
      (secretPath) =>
        !!secretPath.value?.value &&
        typeof secretPath.value.value === 'object' &&
        secretPath.value.value?.id
    )
    .map((secretPath) => ({
      id: secretPath.value.value?.id,
    }));
}
