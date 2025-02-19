/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { get, keyBy } from 'lodash';
import { set } from '@kbn/safer-lodash-set';

import type {
  KafkaOutput,
  NewLogstashOutput,
  NewRemoteElasticsearchOutput,
  Output,
  OutputSecretPath,
} from '../../common/types';

import { packageHasNoPolicyTemplates } from '../../common/services/policy_template';

import type {
  NewOutput,
  NewPackagePolicy,
  RegistryStream,
  UpdatePackagePolicy,
} from '../../common';
import { SO_SEARCH_LIMIT } from '../../common';

import {
  doesPackageHaveIntegrations,
  getNormalizedDataStreams,
  getNormalizedInputs,
} from '../../common/services';

import type {
  PackageInfo,
  PackagePolicy,
  RegistryVarsEntry,
  Secret,
  VarSecretReference,
  PolicySecretReference,
  SecretPath,
  DeletedSecretResponse,
  DeletedSecretReference,
} from '../types';

import { FleetError } from '../errors';
import {
  OUTPUT_SECRETS_MINIMUM_FLEET_SERVER_VERSION,
  SECRETS_ENDPOINT_PATH,
  SECRETS_MINIMUM_FLEET_SERVER_VERSION,
} from '../constants';

import { retryTransientEsErrors } from './epm/elasticsearch/retry';

import { auditLoggingService } from './audit_logging';

import { appContextService } from './app_context';
import { packagePolicyService } from './package_policy';
import { settingsService } from '.';
import { checkFleetServerVersionsForSecretsStorage } from './fleet_server';

export async function createSecrets(opts: {
  esClient: ElasticsearchClient;
  values: string[];
}): Promise<Secret[]> {
  const { esClient, values } = opts;
  const logger = appContextService.getLogger();

  const secretsResponse: Secret[] = await Promise.all(
    values.map(async (value) => {
      try {
        return await retryTransientEsErrors(
          () =>
            esClient.transport.request({
              method: 'POST',
              path: SECRETS_ENDPOINT_PATH,
              body: { value },
            }),
          { logger }
        );
      } catch (err) {
        const msg = `Error creating secrets: ${err}`;
        logger.error(msg);
        throw new FleetError(msg);
      }
    })
  );

  secretsResponse.forEach((item) => {
    auditLoggingService.writeCustomAuditLog({
      message: `secret created: ${item.id}`,
      event: {
        action: 'secret_create',
        category: ['database'],
        type: ['access'],
        outcome: 'success',
      },
    });
  });

  return secretsResponse;
}

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
      if (!acc[secretReference.id]) {
        acc[secretReference.id] = [];
      }
      acc[secretReference.id].push(packagePolicy.id);
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

export async function deleteSecrets(opts: {
  esClient: ElasticsearchClient;
  ids: string[];
}): Promise<void> {
  const { esClient, ids } = opts;
  const logger = appContextService.getLogger();

  const deletedRes: DeletedSecretReference[] = await Promise.all(
    ids.map(async (id) => {
      try {
        const getDeleteRes: DeletedSecretResponse = await retryTransientEsErrors(
          () =>
            esClient.transport.request({
              method: 'DELETE',
              path: `${SECRETS_ENDPOINT_PATH}/${id}`,
            }),
          { logger }
        );

        return { ...getDeleteRes, id };
      } catch (err) {
        const msg = `Error deleting secrets: ${err}`;
        logger.error(msg);
        throw new FleetError(msg);
      }
    })
  );

  deletedRes.forEach((item) => {
    if (item.deleted === true) {
      auditLoggingService.writeCustomAuditLog({
        message: `secret deleted: ${item.id}`,
        event: {
          action: 'secret_delete',
          category: ['database'],
          type: ['access'],
          outcome: 'success',
        },
      });
    }
  });
}

export async function extractAndWriteSecrets(opts: {
  packagePolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
  esClient: ElasticsearchClient;
}): Promise<{ packagePolicy: NewPackagePolicy; secretReferences: PolicySecretReference[] }> {
  const { packagePolicy, packageInfo, esClient } = opts;
  const secretPaths = getPolicySecretPaths(packagePolicy, packageInfo);

  if (!secretPaths.length) {
    return { packagePolicy, secretReferences: [] };
  }

  const secretsToCreate = secretPaths.filter((secretPath) => !!secretPath.value.value);

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
    secretReferences: secrets.map(({ id }) => ({ id })),
  };
}

export async function extractAndWriteOutputSecrets(opts: {
  output: NewOutput;
  esClient: ElasticsearchClient;
  secretHashes?: Record<string, any>;
}): Promise<{ output: NewOutput; secretReferences: PolicySecretReference[] }> {
  const { output, esClient, secretHashes = {} } = opts;

  const secretPaths = getOutputSecretPaths(output.type, output).filter(
    (path) => typeof path.value === 'string'
  );

  if (secretPaths.length === 0) {
    return { output, secretReferences: [] };
  }

  const secrets = await createSecrets({
    esClient,
    values: secretPaths.map(({ value }) => value as string),
  });

  const outputWithSecretRefs = JSON.parse(JSON.stringify(output));
  secretPaths.forEach((secretPath, i) => {
    const pathWithoutPrefix = secretPath.path.replace('secrets.', '');
    const maybeHash = get(secretHashes, pathWithoutPrefix);
    set(outputWithSecretRefs, secretPath.path, {
      id: secrets[i].id,
      ...(typeof maybeHash === 'string' && { hash: maybeHash }),
    });
  });

  return {
    output: outputWithSecretRefs,
    secretReferences: secrets.map(({ id }) => ({ id })),
  };
}

function getOutputSecretPaths(
  outputType: NewOutput['type'],
  output: NewOutput | Partial<Output>
): OutputSecretPath[] {
  const outputSecretPaths: OutputSecretPath[] = [];

  if (outputType === 'logstash') {
    const logstashOutput = output as NewLogstashOutput;
    if (logstashOutput?.secrets?.ssl?.key) {
      outputSecretPaths.push({
        path: 'secrets.ssl.key',
        value: logstashOutput.secrets.ssl.key,
      });
    }
  }

  if (outputType === 'kafka') {
    const kafkaOutput = output as KafkaOutput;
    if (kafkaOutput?.secrets?.password) {
      outputSecretPaths.push({
        path: 'secrets.password',
        value: kafkaOutput.secrets.password,
      });
    }
    if (kafkaOutput?.secrets?.ssl?.key) {
      outputSecretPaths.push({
        path: 'secrets.ssl.key',
        value: kafkaOutput.secrets.ssl.key,
      });
    }
  }

  if (outputType === 'remote_elasticsearch') {
    const remoteESOutput = output as NewRemoteElasticsearchOutput;
    if (remoteESOutput.secrets?.service_token) {
      outputSecretPaths.push({
        path: 'secrets.service_token',
        value: remoteESOutput.secrets.service_token,
      });
    }
    if (remoteESOutput.secrets?.kibana_api_key) {
      outputSecretPaths.push({
        path: 'secrets.kibana_api_key',
        value: remoteESOutput.secrets.kibana_api_key,
      });
    }
  }

  return outputSecretPaths;
}

export async function deleteOutputSecrets(opts: {
  output: Output;
  esClient: ElasticsearchClient;
}): Promise<void> {
  const { output, esClient } = opts;

  const outputType = output.type;
  const outputSecretPaths = getOutputSecretPaths(outputType, output);

  if (outputSecretPaths.length === 0) {
    return Promise.resolve();
  }

  const secretIds = outputSecretPaths.map(({ value }) => (value as { id: string }).id);

  try {
    return deleteSecrets({ esClient, ids: secretIds });
  } catch (err) {
    appContextService.getLogger().warn(`Error deleting secrets: ${err}`);
  }
}

export function getOutputSecretReferences(output: Output): PolicySecretReference[] {
  const outputSecretPaths: PolicySecretReference[] = [];

  if (
    (output.type === 'kafka' || output.type === 'logstash') &&
    typeof output.secrets?.ssl?.key === 'object'
  ) {
    outputSecretPaths.push({
      id: output.secrets.ssl.key.id,
    });
  }

  if (output.type === 'kafka' && typeof output?.secrets?.password === 'object') {
    outputSecretPaths.push({
      id: output.secrets.password.id,
    });
  }

  if (output.type === 'remote_elasticsearch') {
    if (typeof output?.secrets?.service_token === 'object') {
      outputSecretPaths.push({
        id: output.secrets.service_token.id,
      });
    }
    if (typeof output?.secrets?.kibana_api_key === 'object') {
      outputSecretPaths.push({
        id: output.secrets.kibana_api_key.id,
      });
    }
  }

  return outputSecretPaths;
}

export async function extractAndUpdateSecrets(opts: {
  oldPackagePolicy: PackagePolicy;
  packagePolicyUpdate: UpdatePackagePolicy;
  packageInfo: PackageInfo;
  esClient: ElasticsearchClient;
}): Promise<{
  packagePolicyUpdate: UpdatePackagePolicy;
  secretReferences: PolicySecretReference[];
  secretsToDelete: PolicySecretReference[];
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
    ...noChange.map((secretPath) => ({ id: secretPath.value.value.id })),
    ...createdSecrets.map(({ id }) => ({ id })),
  ];

  const secretsToDelete: PolicySecretReference[] = [];

  toDelete.forEach((secretPath) => {
    // check if the previous secret is actually a secret refrerence
    // it may be that secrets were not enabled at the time of creation
    // in which case they are just stored as plain text
    if (secretPath.value.value?.isSecretRef) {
      secretsToDelete.push({ id: secretPath.value.value.id });
    }
  });

  return {
    packagePolicyUpdate: policyWithSecretRefs,
    secretReferences,
    secretsToDelete,
  };
}
export async function extractAndUpdateOutputSecrets(opts: {
  oldOutput: Output;
  outputUpdate: Partial<Output>;
  esClient: ElasticsearchClient;
  secretHashes?: Record<string, any>;
}): Promise<{
  outputUpdate: Partial<Output>;
  secretReferences: PolicySecretReference[];
  secretsToDelete: PolicySecretReference[];
}> {
  const { oldOutput, outputUpdate, esClient, secretHashes } = opts;
  const outputType = outputUpdate.type || oldOutput.type;
  const oldSecretPaths = getOutputSecretPaths(oldOutput.type, oldOutput);
  const updatedSecretPaths = getOutputSecretPaths(outputType, outputUpdate);

  if (!oldSecretPaths.length && !updatedSecretPaths.length) {
    return { outputUpdate, secretReferences: [], secretsToDelete: [] };
  }

  const { toCreate, toDelete, noChange } = diffOutputSecretPaths(
    oldSecretPaths,
    updatedSecretPaths
  );

  const createdSecrets = await createSecrets({
    esClient,
    values: toCreate.map((secretPath) => secretPath.value as string),
  });

  const outputWithSecretRefs = JSON.parse(JSON.stringify(outputUpdate));
  toCreate.forEach((secretPath, i) => {
    const pathWithoutPrefix = secretPath.path.replace('secrets.', '');
    const maybeHash = get(secretHashes, pathWithoutPrefix);

    set(outputWithSecretRefs, secretPath.path, {
      id: createdSecrets[i].id,
      ...(typeof maybeHash === 'string' && { hash: maybeHash }),
    });
  });

  const secretReferences = [
    ...noChange.map((secretPath) => ({ id: (secretPath.value as { id: string }).id })),
    ...createdSecrets.map(({ id }) => ({ id })),
  ];

  return {
    outputUpdate: outputWithSecretRefs,
    secretReferences,
    secretsToDelete: toDelete.map((secretPath) => ({
      id: (secretPath.value as { id: string }).id,
    })),
  };
}

function isSecretVar(varDef: RegistryVarsEntry) {
  return varDef.secret === true;
}

function containsSecretVar(vars?: RegistryVarsEntry[]) {
  return vars?.some(isSecretVar);
}

// this is how secrets are stored on the package policy
function toVarSecretRef(id: string): VarSecretReference {
  return { id, isSecretRef: true };
}

// this is how IDs are inserted into compiled templates
export function toCompiledSecretRef(id: string) {
  return `$co.elastic.secret{${id}}`;
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

export function diffOutputSecretPaths(
  oldPaths: OutputSecretPath[],
  newPaths: OutputSecretPath[]
): { toCreate: OutputSecretPath[]; toDelete: OutputSecretPath[]; noChange: OutputSecretPath[] } {
  const toCreate: OutputSecretPath[] = [];
  const toDelete: OutputSecretPath[] = [];
  const noChange: OutputSecretPath[] = [];
  const newPathsByPath = keyBy(newPaths, 'path');

  for (const oldPath of oldPaths) {
    if (!newPathsByPath[oldPath.path]) {
      toDelete.push(oldPath);
    }

    const newPath = newPathsByPath[oldPath.path];
    if (newPath && newPath.value) {
      const newValue = newPath.value;
      if (typeof newValue === 'string') {
        toCreate.push(newPath);
        toDelete.push(oldPath);
      } else {
        noChange.push(newPath);
      }
    }
    delete newPathsByPath[oldPath.path];
  }

  const remainingNewPaths = Object.values(newPathsByPath);

  return { toCreate: [...toCreate, ...remainingNewPaths], toDelete, noChange };
}

// Given a package policy and a package,
// returns an array of lodash style paths to all secrets and their current values
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

export async function isSecretStorageEnabled(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract
): Promise<boolean> {
  const logger = appContextService.getLogger();

  // if serverless then secrets will always be supported
  const isFleetServerStandalone =
    appContextService.getConfig()?.internal?.fleetServerStandalone ?? false;

  if (isFleetServerStandalone) {
    logger.trace('Secrets storage is enabled as fleet server is standalone');
    return true;
  }

  // now check the flag in settings to see if the fleet server requirement has already been met
  // once the requirement has been met, secrets are always on
  const settings = await settingsService.getSettingsOrUndefined(soClient);

  if (settings && settings.secret_storage_requirements_met) {
    logger.debug('Secrets storage requirements already met, turned on in settings');
    return true;
  }

  const areAllFleetServersOnProperVersion = await checkFleetServerVersionsForSecretsStorage(
    esClient,
    soClient,
    SECRETS_MINIMUM_FLEET_SERVER_VERSION
  );

  // otherwise check if we have the minimum fleet server version and enable secrets if so
  if (areAllFleetServersOnProperVersion) {
    logger.debug('Enabling secrets storage as minimum fleet server version has been met');
    try {
      await settingsService.saveSettings(soClient, {
        secret_storage_requirements_met: true,
      });
    } catch (err) {
      // we can suppress this error as it will be retried on the next function call
      logger.warn(`Failed to save settings after enabling secrets storage: ${err.message}`);
    }

    return true;
  }

  logger.info('Secrets storage is disabled as minimum fleet server version has not been met');
  return false;
}

export async function isOutputSecretStorageEnabled(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract
): Promise<boolean> {
  const logger = appContextService.getLogger();

  // if serverless then output secrets will always be supported
  const isFleetServerStandalone =
    appContextService.getConfig()?.internal?.fleetServerStandalone ?? false;

  if (isFleetServerStandalone) {
    logger.trace('Output secrets storage is enabled as fleet server is standalone');
    return true;
  }

  // now check the flag in settings to see if the fleet server requirement has already been met
  // once the requirement has been met, output secrets are always on
  const settings = await settingsService.getSettingsOrUndefined(soClient);

  if (settings && settings.output_secret_storage_requirements_met) {
    logger.debug('Output secrets storage requirements already met, turned on in settings');
    return true;
  }

  // otherwise check if we have the minimum fleet server version and enable secrets if so
  if (
    await checkFleetServerVersionsForSecretsStorage(
      esClient,
      soClient,
      OUTPUT_SECRETS_MINIMUM_FLEET_SERVER_VERSION
    )
  ) {
    logger.debug('Enabling output secrets storage as minimum fleet server version has been met');
    try {
      await settingsService.saveSettings(soClient, {
        output_secret_storage_requirements_met: true,
      });
    } catch (err) {
      // we can suppress this error as it will be retried on the next function call
      logger.warn(`Failed to save settings after enabling output secrets storage: ${err.message}`);
    }

    return true;
  }

  logger.info(
    'Output secrets storage is disabled as minimum fleet server version has not been met'
  );
  return false;
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

/**
 * Given an array of secret paths, existing secrets, and a package policy, generates a
 * new package policy object that includes resolved secret reference values at each
 * provided path.
 */
function getPolicyWithSecretReferences(
  secretPaths: SecretPath[],
  secrets: Secret[],
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
        acc[val].value = toVarSecretRef(secrets[secretPathIndex].id);
      }

      return acc[val];
    }, result);
  });

  return result;
}
