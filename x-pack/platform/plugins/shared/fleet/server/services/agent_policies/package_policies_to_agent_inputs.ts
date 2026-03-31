/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import apm from 'elastic-apm-node';
import { merge } from 'lodash';
import deepMerge from 'deepmerge';
import type { SavedObjectsClientContract } from '@kbn/core/server';

import type { FullAgentPolicyAddFields, GlobalDataTag } from '../../../common/types';
import { getAgentlessGlobalDataTags } from '../../../common/services/agentless_policy_helper';

import type {
  PackagePolicy,
  FullAgentPolicyInput,
  FullAgentPolicyInputStream,
  PackageInfo,
  PackagePolicyInput,
  NewPackagePolicyInput,
  PackagePolicySOAttributes,
} from '../../types';
import { DEFAULT_OUTPUT } from '../../constants';
import { pkgToPkgKey } from '../epm/registry';
import {
  DATASET_VAR_NAME,
  DATA_STREAM_TYPE_VAR_NAME,
  FLEET_ENDPOINT_PACKAGE,
  GLOBAL_DATA_TAG_EXCLUDED_INPUTS,
  OTEL_COLLECTOR_INPUT_TYPE,
  USE_APM_VAR_NAME,
} from '../../../common/constants/epm';
import { _compilePackagePolicyInputs, getPackagePolicySavedObjectType } from '../package_policy';
import { getAgentTemplateAssetsMap } from '../epm/packages/get';
import { appContextService } from '../app_context';
import { FleetError, PackagePolicyValidationError } from '../../errors';
import { packagePolicyInputAllowsUndefinedDataStreamType } from '../../../common/services';

const isPolicyEnabled = (packagePolicy: PackagePolicy) => {
  return packagePolicy.enabled && packagePolicy.inputs && packagePolicy.inputs.length;
};

export function getInputId(
  input: NewPackagePolicyInput,
  packagePolicyId?: string,
  packageInfo?: PackageInfo
): string {
  // Only the endpoint (Elastic Defend) package uses a simplified ID format for backward compatibility.
  // All other packages (including other limited packages) use the standard format with type and policy template.
  const useSimplifiedId = packageInfo?.name === FLEET_ENDPOINT_PACKAGE;

  return useSimplifiedId
    ? packagePolicyId || 'default'
    : `${input.type}${input.policy_template ? `-${input.policy_template}` : ''}${
        packagePolicyId ? `-${packagePolicyId}` : ''
      }`;
}

export const storedPackagePolicyToAgentInputs = (
  packagePolicy: PackagePolicy,
  packageInfo?: PackageInfo,
  agentPolicyOutputId: string = DEFAULT_OUTPUT.name,
  agentPolicyNamespace?: string,
  addFields?: FullAgentPolicyAddFields
): FullAgentPolicyInput[] => {
  const fullInputs: FullAgentPolicyInput[] = [];

  if (!isPolicyEnabled(packagePolicy)) {
    return fullInputs;
  }

  packagePolicy.inputs.forEach((input) => {
    if (!input.enabled) {
      return;
    }

    const fullInput: FullAgentPolicyInput = {
      // @ts-ignore-next-line the following id is actually one level above the one in fullInputStream, but the linter thinks it gets overwritten
      id: input.id ?? getInputId(input, packagePolicy.id, packageInfo), // Generate input id if not already set
      revision: packagePolicy.revision,
      name: packagePolicy.name,
      type: input.type,
      // @ts-ignore-next-line
      data_stream: {
        namespace: packagePolicy?.namespace || agentPolicyNamespace || 'default', // custom namespace has precedence on agent policy's one
      },
      use_output: packagePolicy.output_id || agentPolicyOutputId,
      package_policy_id: packagePolicy.id,
      ...getFullInputStreams(input),
    };

    // Guard: undefined data_stream.type is only valid for inputs that allow dynamic signal types.
    // Checked per-input so mixed packages (some dynamic, some static) are handled correctly.
    if (fullInput.streams) {
      const inputAllowsDynamic =
        packageInfo !== undefined &&
        packagePolicyInputAllowsUndefinedDataStreamType(packageInfo, input);
      for (const stream of fullInput.streams) {
        if (stream.data_stream?.type === undefined) {
          if (inputAllowsDynamic) {
            // For dynamic inputs, type is determined at runtime — strip the undefined key
            const { type: _type, ...restDataStream } = stream.data_stream ?? {};
            stream.data_stream = restDataStream as FullAgentPolicyInputStream['data_stream'];
          } else {
            // Should never reach here if preflightCheckPackagePolicy ran, but throw defensively
            throw new PackagePolicyValidationError(
              `[data_stream.type]: unexpected undefined stream type for non-dynamic package`
            );
          }
        }
      }
    }

    if (addFields && !GLOBAL_DATA_TAG_EXCLUDED_INPUTS.has(fullInput.type)) {
      fullInput.processors = [addFields];
    }

    // deeply merge the input.config values with the full policy input
    merge(
      fullInput,
      Object.entries(input.config || {}).reduce((acc, [key, { value }]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, unknown>)
    );
    if (packagePolicy.package) {
      fullInput.meta = {
        package: {
          name: packagePolicy.package.name,
          version: packagePolicy.package.version ?? packageInfo?.version,
          ...(input.policy_template ? { policy_template: input.policy_template } : {}),
          ...(packageInfo?.release ? { release: packageInfo.release } : {}),
          agentVersion: packageInfo?.conditions?.agent?.version,
        },
      };
    }

    const fullInputWithOverrides = mergeInputsOverrides(packagePolicy, fullInput);
    fullInputs.push(fullInputWithOverrides);
  });
  return fullInputs;
};

export const mergeInputsOverrides = (
  packagePolicy: PackagePolicy,
  fullInput: FullAgentPolicyInput
) => {
  // check if there are inputs overrides and merge them
  if (packagePolicy?.overrides?.inputs) {
    const overrideInputs = packagePolicy.overrides.inputs;
    const keys = Object.keys(overrideInputs);

    if (keys.length > 0 && fullInput.id === keys[0]) {
      return deepMerge<FullAgentPolicyInput>(fullInput, overrideInputs[keys[0]]);
    }
  }
  return fullInput;
};

export const getFullInputStreams = (
  input: PackagePolicyInput,
  allStreamEnabled: boolean = false,
  streamsOriginalIdsMap?: Map<string, string> // Map of stream ids <destinationId, originalId>
): FullAgentPolicyInputStream => {
  return {
    ...(input.compiled_input || {}),
    ...(input.streams.length
      ? {
          streams: input.streams
            .filter((stream) => stream.enabled || allStreamEnabled)
            .map((stream) => {
              const streamId = stream.id;
              const { data_stream: compiledDataStream, ...compiledStream } =
                stream.compiled_stream ?? {};
              const fullStream: FullAgentPolicyInputStream = {
                id: streamId,
                data_stream: {
                  ...stream.data_stream,
                  ...compiledDataStream,
                },
                ...compiledStream,
                ...Object.entries(stream.config || {}).reduce((acc, [key, { value }]) => {
                  acc[key] = value;
                  return acc;
                }, {} as { [k: string]: any }),
              };
              const dsTypeVar = stream.vars?.[DATA_STREAM_TYPE_VAR_NAME]?.value;
              if (dsTypeVar) {
                fullStream.data_stream = {
                  ...fullStream.data_stream,
                  type: dsTypeVar,
                };
              }

              if (input.type === OTEL_COLLECTOR_INPUT_TYPE) {
                const datasetVar = stream.vars?.[DATASET_VAR_NAME]?.value;
                if (datasetVar) {
                  fullStream.data_stream = {
                    ...fullStream.data_stream,
                    dataset: datasetVar,
                  };
                }

                const useAPMVar = stream.vars?.[USE_APM_VAR_NAME]?.value;
                if (useAPMVar !== undefined) {
                  fullStream[USE_APM_VAR_NAME] = useAPMVar;
                }
              }

              streamsOriginalIdsMap?.set(fullStream.id, streamId);

              return fullStream;
            }),
        }
      : {}),
  };
};

export const recompileInputsWithAgentVersion = async (
  packageInfo: PackageInfo,
  packagePolicy: PackagePolicy,
  agentVersion: string,
  soClient: SavedObjectsClientContract
): Promise<PackagePolicyInput[]> => {
  const logger = appContextService.getLogger();
  const assetsMap = await getAgentTemplateAssetsMap({
    logger,
    packageInfo: packageInfo!,
    savedObjectsClient: soClient,
  });

  const inputs = _compilePackagePolicyInputs(
    packageInfo!,
    packagePolicy.vars || {},
    packagePolicy.inputs,
    assetsMap,
    agentVersion
  );
  return inputs;
};

export const storedPackagePoliciesToAgentInputs = async (
  packagePolicies: PackagePolicy[],
  packageInfoCache: Map<string, PackageInfo>,
  agentPolicyOutputId: string = DEFAULT_OUTPUT.name,
  agentPolicyNamespace?: string,
  globalDataTags?: GlobalDataTag[],
  agentVersion?: string,
  soClient?: SavedObjectsClientContract,
  hasAgentVersionConditions?: boolean
): Promise<FullAgentPolicyInput[]> => {
  const fullInputs: FullAgentPolicyInput[] = [];

  for (const packagePolicy of packagePolicies) {
    if (!isPolicyEnabled(packagePolicy)) {
      continue;
    }

    const packageInfo = packagePolicy.package
      ? packageInfoCache.get(pkgToPkgKey(packagePolicy.package))
      : undefined;

    const filteredGlobalDataTags = filterGlobalDataTags(globalDataTags, packageInfo);
    const addFields =
      filteredGlobalDataTags && filteredGlobalDataTags.length > 0
        ? globalDataTagsToAddFields(filteredGlobalDataTags)
        : undefined;

    let packagePolicyWithUpdatedInputs = packagePolicy;
    // recompile inputs to apply agent version conditions
    if (
      agentVersion &&
      appContextService.getExperimentalFeatures().enableVersionSpecificPolicies &&
      hasAgentVersionConditions
    ) {
      const span = apm.startSpan(
        `read packagePolicySO inputs_for_versions ${packageInfo!.name}-${
          packageInfo!.version
        } ${agentVersion}`,
        'full-agent-policy'
      );
      const packagePolicySO = await soClient?.get<PackagePolicySOAttributes>(
        await getPackagePolicySavedObjectType(),
        packagePolicy.id
      );
      const inputsForVersions = packagePolicySO?.attributes.inputs_for_versions;
      const hasVersionSpecificInputs =
        inputsForVersions && Object.keys(inputsForVersions).length > 0;

      if (hasVersionSpecificInputs) {
        // Package has version conditions - we should have compiled inputs for this version
        const versionInputs = inputsForVersions[agentVersion];
        if (!versionInputs) {
          span?.end();
          throw new FleetError(
            `Missing inputs_for_versions for agent version ${agentVersion} in package policy ${packagePolicy.id}. ` +
              `Available versions: ${Object.keys(inputsForVersions).join(', ')}`
          );
        }
        packagePolicyWithUpdatedInputs = {
          ...packagePolicy,
          inputs: versionInputs,
        };
      }
      // If no version-specific inputs exist, package doesn't have version conditions - use default inputs
      span?.end();
    }

    fullInputs.push(
      ...storedPackagePolicyToAgentInputs(
        packagePolicyWithUpdatedInputs,
        packageInfo,
        agentPolicyOutputId,
        agentPolicyNamespace,
        addFields
      )
    );
  }

  return fullInputs;
};

const globalDataTagsToAddFields = (tags: GlobalDataTag[]): FullAgentPolicyAddFields => {
  const fields: { [key: string]: string | number } = {};

  tags.forEach((tag) => {
    fields[tag.name] = tag.value;
  });

  return {
    add_fields: {
      target: '',
      fields,
    },
  };
};

const filterGlobalDataTags = (
  globalDataTags: GlobalDataTag[] | undefined,
  packageInfo: PackageInfo | undefined
): GlobalDataTag[] | undefined => {
  if (!globalDataTags) {
    return globalDataTags;
  }

  const agentlessGlobalDataTags = getAgentlessGlobalDataTags(packageInfo);

  if (!agentlessGlobalDataTags) {
    return globalDataTags;
  }

  return globalDataTags.filter((globalDataTag) => {
    return !agentlessGlobalDataTags.some(
      ({ name, value }) => name === globalDataTag.name && value === globalDataTag.value
    );
  });
};
