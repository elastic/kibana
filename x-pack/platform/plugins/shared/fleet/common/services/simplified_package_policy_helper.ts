/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEmpty } from 'lodash';

import type {
  NewPackagePolicyInput,
  NewPackagePolicyInputStream,
  PackagePolicyConfigRecord,
  PackagePolicy,
  NewPackagePolicy,
  PackageInfo,
  ExperimentalDataStreamFeature,
} from '../types';
import { AGENTLESS_DISABLED_INPUTS, DATASET_VAR_NAME } from '../constants';
import { PackagePolicyValidationError } from '../errors';

import { packageToPackagePolicy } from '.';
import { inputNotAllowedInAgentless } from './agentless_policy_helper';

export type SimplifiedVars = Record<string, string | string[] | boolean | number | number[] | null>;

export type SimplifiedPackagePolicyStreams = Record<
  string,
  {
    enabled?: undefined | boolean;
    vars?: SimplifiedVars;
  }
>;

export type SimplifiedInputs = Record<
  string,
  {
    enabled?: boolean | undefined;
    vars?: SimplifiedVars;
    streams?: SimplifiedPackagePolicyStreams;
  }
>;

export interface SimplifiedPackagePolicy {
  id?: string;
  policy_id?: string | null;
  policy_ids: string[];
  output_id?: string;
  namespace: string;
  name: string;
  description?: string;
  vars?: SimplifiedVars;
  inputs?: SimplifiedInputs;
  supports_agentless?: boolean | null;
  additional_datastreams_permissions?: string[];
}

export interface FormattedPackagePolicy extends Omit<PackagePolicy, 'inputs' | 'vars'> {
  inputs?: SimplifiedInputs;
  vars?: SimplifiedVars;
}

export interface FormattedCreatePackagePolicyResponse {
  item: FormattedPackagePolicy;
}

export function packagePolicyToSimplifiedPackagePolicy(packagePolicy: PackagePolicy) {
  const formattedPackagePolicy = packagePolicy as unknown as FormattedPackagePolicy;
  formattedPackagePolicy.inputs = formatInputs(packagePolicy.inputs);
  if (packagePolicy.vars) {
    formattedPackagePolicy.vars = formatVars(packagePolicy.vars);
  }

  return formattedPackagePolicy;
}

export function generateInputId(input: NewPackagePolicyInput) {
  return `${input.policy_template ? `${input.policy_template}-` : ''}${input.type}`;
}

export function formatInputs(inputs: NewPackagePolicy['inputs'], supportsAgentless?: boolean) {
  return inputs.reduce((acc, input) => {
    const inputId = generateInputId(input);
    if (!acc) {
      acc = {};
    }
    const enabled =
      supportsAgentless === true && AGENTLESS_DISABLED_INPUTS.includes(input.type)
        ? false
        : input.enabled;
    acc[inputId] = {
      enabled,
      vars: formatVars(input.vars),
      streams: formatStreams(input.streams),
    };

    return acc;
  }, {} as SimplifiedPackagePolicy['inputs']);
}

export function formatVars(vars: NewPackagePolicy['inputs'][number]['vars']) {
  if (!vars) {
    return;
  }

  return Object.entries(vars).reduce((acc, [varKey, varRecord]) => {
    // the dataset var uses an internal format before we send it
    if (varKey === DATASET_VAR_NAME && varRecord?.value?.dataset) {
      acc[varKey] = varRecord?.value.dataset;
    } else {
      acc[varKey] = varRecord?.value;
    }

    return acc;
  }, {} as SimplifiedVars);
}

function formatStreams(streams: NewPackagePolicy['inputs'][number]['streams']) {
  return streams.reduce((acc, stream) => {
    if (!acc) {
      acc = {};
    }
    acc[stream.data_stream.dataset] = {
      enabled: stream.enabled,
      vars: formatVars(stream.vars),
    };

    return acc;
  }, {} as SimplifiedPackagePolicyStreams);
}

function assignVariables(
  userProvidedVars: SimplifiedVars,
  varsRecord?: PackagePolicyConfigRecord,
  ctxMessage = ''
) {
  Object.entries(userProvidedVars).forEach(([varKey, varValue]) => {
    if (!varsRecord || !varsRecord[varKey]) {
      throw new PackagePolicyValidationError(`Variable ${ctxMessage}:${varKey} not found`);
    }

    varsRecord[varKey].value = varValue;
  });
}

type StreamsMap = Map<string, NewPackagePolicyInputStream>;
type InputMap = Map<string, { input: NewPackagePolicyInput; streams: StreamsMap }>;

export function simplifiedPackagePolicytoNewPackagePolicy(
  data: SimplifiedPackagePolicy,
  packageInfo: PackageInfo,
  options?: {
    experimental_data_stream_features?: ExperimentalDataStreamFeature[];
  }
): NewPackagePolicy {
  const {
    policy_id: policyId,
    policy_ids: policyIds,
    output_id: outputId,
    namespace,
    name,
    description,
    inputs = {},
    vars: packageLevelVars,
    supports_agentless: supportsAgentless,
    additional_datastreams_permissions: additionalDatastreamsPermissions,
  } = data;
  const packagePolicy = {
    ...packageToPackagePolicy(
      packageInfo,
      policyId && isEmpty(policyIds) ? policyId : policyIds,
      namespace,
      name,
      description
    ),
    supports_agentless: supportsAgentless,
    output_id: outputId,
  };

  if (additionalDatastreamsPermissions) {
    packagePolicy.additional_datastreams_permissions = additionalDatastreamsPermissions;
  }

  if (packagePolicy.package && options?.experimental_data_stream_features) {
    packagePolicy.package.experimental_data_stream_features =
      options.experimental_data_stream_features;
  }

  // Build a input and streams Map to easily find package policy stream
  const inputMap: InputMap = new Map();
  packagePolicy.inputs.forEach((input) => {
    const streamMap: StreamsMap = new Map();
    input.streams.forEach((stream) => {
      streamMap.set(stream.data_stream.dataset, stream);
    });
    inputMap.set(generateInputId(input), { input, streams: streamMap });
  });

  if (packageLevelVars) {
    assignVariables(packageLevelVars, packagePolicy.vars);
  }

  Object.entries(inputs).forEach(([inputId, val]) => {
    const { enabled, streams = {}, vars: inputLevelVars } = val;

    const { input: packagePolicyInput, streams: streamsMap } = inputMap.get(inputId) ?? {};
    if (!packagePolicyInput || !streamsMap) {
      throw new PackagePolicyValidationError(`Input not found: ${inputId}`);
    }

    if (
      inputNotAllowedInAgentless(packagePolicyInput.type, packagePolicy?.supports_agentless) ||
      enabled === false
    ) {
      packagePolicyInput.enabled = false;
    } else {
      packagePolicyInput.enabled = true;
    }

    if (inputLevelVars) {
      assignVariables(inputLevelVars, packagePolicyInput.vars, `${inputId}`);
    }

    Object.entries(streams).forEach(([streamId, streamVal]) => {
      const { enabled: streamEnabled, vars: streamsLevelVars } = streamVal;
      const packagePolicyStream = streamsMap.get(streamId);
      if (!packagePolicyStream) {
        throw new PackagePolicyValidationError(`Stream not found ${inputId}: ${streamId}`);
      }

      if (
        streamEnabled === false ||
        inputNotAllowedInAgentless(packagePolicyInput.type, packagePolicy?.supports_agentless)
      ) {
        packagePolicyStream.enabled = false;
      } else {
        packagePolicyStream.enabled = true;
      }

      if (streamsLevelVars) {
        assignVariables(streamsLevelVars, packagePolicyStream.vars, `${inputId} ${streamId}`);
      }
    });
  });

  return packagePolicy;
}
