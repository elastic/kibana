/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { merge } from 'lodash';
import deepMerge from 'deepmerge';

import type { FullAgentPolicyAddFields, GlobalDataTag } from '../../../common/types';
import { isPackageLimited } from '../../../common/services';
import type {
  PackagePolicy,
  FullAgentPolicyInput,
  FullAgentPolicyInputStream,
  PackageInfo,
  PackagePolicyInput,
} from '../../types';
import { DEFAULT_OUTPUT } from '../../constants';
import { pkgToPkgKey } from '../epm/registry';
import { GLOBAL_DATA_TAG_EXCLUDED_INPUTS } from '../../../common/constants/epm';

const isPolicyEnabled = (packagePolicy: PackagePolicy) => {
  return packagePolicy.enabled && packagePolicy.inputs && packagePolicy.inputs.length;
};

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

  // Marks to skip appending input information to package policy ID to make it unique if package is "limited":
  // this means that only one policy for the package can exist on the agent policy, so its ID is already unique
  const appendInputId = packageInfo && isPackageLimited(packageInfo) ? false : true;

  packagePolicy.inputs.forEach((input) => {
    if (!input.enabled) {
      return;
    }

    const inputId = appendInputId
      ? `${input.type}${input.policy_template ? `-${input.policy_template}-` : '-'}${
          packagePolicy.id
        }`
      : packagePolicy.id;

    const fullInput: FullAgentPolicyInput = {
      // @ts-ignore-next-line the following id is actually one level above the one in fullInputStream, but the linter thinks it gets overwritten
      id: inputId,
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
          version: packagePolicy.package.version,
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
              const fullStream: FullAgentPolicyInputStream = {
                id: streamId,
                data_stream: stream.data_stream,
                ...stream.compiled_stream,
                ...Object.entries(stream.config || {}).reduce((acc, [key, { value }]) => {
                  acc[key] = value;
                  return acc;
                }, {} as { [k: string]: any }),
              };
              streamsOriginalIdsMap?.set(fullStream.id, streamId);

              return fullStream;
            }),
        }
      : {}),
  };
};

export const storedPackagePoliciesToAgentInputs = async (
  packagePolicies: PackagePolicy[],
  packageInfoCache: Map<string, PackageInfo>,
  agentPolicyOutputId: string = DEFAULT_OUTPUT.name,
  agentPolicyNamespace?: string,
  globalDataTags?: GlobalDataTag[]
): Promise<FullAgentPolicyInput[]> => {
  const fullInputs: FullAgentPolicyInput[] = [];

  const addFields =
    globalDataTags && globalDataTags.length > 0
      ? globalDataTagsToAddFields(globalDataTags)
      : undefined;

  for (const packagePolicy of packagePolicies) {
    if (!isPolicyEnabled(packagePolicy)) {
      continue;
    }

    const packageInfo = packagePolicy.package
      ? packageInfoCache.get(pkgToPkgKey(packagePolicy.package))
      : undefined;

    fullInputs.push(
      ...storedPackagePolicyToAgentInputs(
        packagePolicy,
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
