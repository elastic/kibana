/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import {
  DATASET_VAR_NAME,
  dataTypes,
  OTEL_COLLECTOR_INPUT_TYPE,
  USE_APM_VAR_NAME,
} from '../constants';
import type {
  RegistryPolicyTemplate,
  RegistryPolicyInputOnlyTemplate,
  RegistryPolicyIntegrationTemplate,
  RegistryInput,
  PackageInfo,
  RegistryVarsEntry,
  RegistryDataStream,
  InputOnlyRegistryDataStream,
  InstallablePackage,
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackagePolicyInput,
} from '../types';

const DATA_STREAM_DATASET_VAR: RegistryVarsEntry = {
  name: DATASET_VAR_NAME,
  type: 'text',
  title: i18n.translate('xpack.fleet.policyTemplate.datasetVar.title', {
    defaultMessage: 'Dataset name',
  }),
  description: i18n.translate('xpack.fleet.policyTemplate.datasetVar.description', {
    defaultMessage:
      "Set the name for your dataset. Once selected a dataset cannot be changed without creating a new integration policy. You can't use `-` in the name of a dataset and only valid characters for [Elasticsearch index names](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-index_.html) are permitted.\n",
  }),
  multi: false,
  required: true,
  show_user: true,
};

export const DATA_STREAM_USE_APM_VAR: RegistryVarsEntry = {
  name: USE_APM_VAR_NAME,
  type: 'bool',
  title: i18n.translate('xpack.fleet.policyTemplate.useAPMVar.title', {
    defaultMessage: 'Enable Elastic APM Enrichment',
  }),
  description: i18n.translate('xpack.fleet.policyTemplate.useAPMVar.description', {
    defaultMessage:
      "Include additional policy configuration to integrate trace data with Elastic's APM UI",
  }),
  multi: false,
  required: false,
  show_user: true,
  default: true,
};

export function packageHasNoPolicyTemplates(packageInfo: PackageInfo): boolean {
  return (
    !packageInfo.policy_templates ||
    packageInfo.policy_templates.length === 0 ||
    !packageInfo.policy_templates.find(
      (policyTemplate) =>
        isInputOnlyPolicyTemplate(policyTemplate) ||
        (policyTemplate.inputs && policyTemplate.inputs.length > 0)
    )
  );
}

export function isInputOnlyPolicyTemplate(
  policyTemplate: RegistryPolicyTemplate
): policyTemplate is RegistryPolicyInputOnlyTemplate {
  return 'input' in policyTemplate;
}

export function isIntegrationPolicyTemplate(
  policyTemplate: RegistryPolicyTemplate
): policyTemplate is RegistryPolicyIntegrationTemplate {
  return !isInputOnlyPolicyTemplate(policyTemplate);
}

export const getNormalizedInputs = (policyTemplate: RegistryPolicyTemplate): RegistryInput[] => {
  if (isIntegrationPolicyTemplate(policyTemplate)) {
    return policyTemplate.inputs || [];
  }
  const input: RegistryInput = {
    type: policyTemplate.input,
    title: policyTemplate.title,
    description: policyTemplate.description,
    ...(policyTemplate.deprecated ? { deprecated: policyTemplate.deprecated } : {}),
    // Propagate dynamic_signal_types from input-only template into the normalized RegistryInput
    // so downstream helpers (registryInputAllowsDynamicSignalTypes, etc.) work uniformly
    // regardless of whether the source is an input-only or composable integration package.
    ...(policyTemplate.dynamic_signal_types !== undefined
      ? { dynamic_signal_types: policyTemplate.dynamic_signal_types }
      : {}),
  };

  return [input];
};

/**
 * Returns the `RegistryInput` definition for a given policy template and input type.
 * - Input-only templates: the single synthesized RegistryInput (from template fields).
 * - Integration templates: the matching entry from `inputs[]`.
 */
export function getPolicyTemplateInputDefinition(
  policyTemplate: RegistryPolicyTemplate,
  inputType?: string
): RegistryInput | undefined {
  if (isInputOnlyPolicyTemplate(policyTemplate)) {
    const [def] = getNormalizedInputs(policyTemplate);
    return def;
  }
  if (!inputType) return undefined;
  return (policyTemplate.inputs ?? []).find((input) => input.type === inputType);
}

/**
 * Returns true when the given RegistryInput declares dynamic signal types.
 * The package-spec governs which inputs may set this flag; Fleet trusts the
 * boolean without gating on the input type so future non-OTel inputs can use
 * the same mechanism without requiring a Fleet change.
 */
export function registryInputAllowsDynamicSignalTypes(input: RegistryInput): boolean {
  return input.dynamic_signal_types === true;
}

/**
 * Returns true when any policy template in the package contains an input that
 * declares dynamic signal types (dynamic_signal_types: true).
 *
 * Optionally, you can scope the query to a specific policy template and/or input type.
 *
 * Covers both:
 *   - Input-only packages (top-level `input` key on the policy template)
 *   - Composable integration packages (nested `inputs[]` entries)
 */
export const hasDynamicSignalTypes = (
  packageInfo: PackageInfo | undefined,
  scope?: { policyTemplateName?: string; inputType?: string }
): boolean =>
  (packageInfo?.policy_templates ?? []).some((template) => {
    if (scope?.policyTemplateName && template.name !== scope.policyTemplateName) return false;
    const inputs = getNormalizedInputs(template);
    const relevant = scope?.inputType
      ? inputs.filter((input) => input.type === scope.inputType)
      : inputs;
    return relevant.some(registryInputAllowsDynamicSignalTypes);
  });

/**
 * Returns true when the given package policy input corresponds to a registry input
 * that allows undefined data_stream.type (i.e. dynamic_signal_types).
 *
 * Works for both:
 *   - Input-only packages (policy template with top-level `input` key)
 *   - Composable integration packages (policy template with `inputs[]`)
 */
export function packagePolicyInputAllowsUndefinedDataStreamType(
  packageInfo: PackageInfo,
  packagePolicyInput: Pick<NewPackagePolicyInput | PackagePolicyInput, 'type' | 'policy_template'>
): boolean {
  return hasDynamicSignalTypes(packageInfo, {
    policyTemplateName: packagePolicyInput.policy_template,
    inputType: packagePolicyInput.type,
  });
}

export function getNormalizedDataStreams(
  packageInfo: { type: 'input' } & (PackageInfo | InstallablePackage),
  datasetName?: string,
  dataStreamType?: string
): InputOnlyRegistryDataStream[];

export function getNormalizedDataStreams(
  packageInfo: PackageInfo | InstallablePackage,
  datasetName?: string,
  dataStreamType?: string
): RegistryDataStream[];

export function getNormalizedDataStreams(
  packageInfo: PackageInfo | InstallablePackage,
  datasetName?: string,
  dataStreamType?: string
): RegistryDataStream[] | InputOnlyRegistryDataStream[] {
  if (packageInfo.type !== 'input') {
    return packageInfo.data_streams || [];
  }

  const policyTemplates = packageInfo.policy_templates as RegistryPolicyInputOnlyTemplate[];

  if (!policyTemplates || policyTemplates.length === 0) {
    return [];
  }

  return policyTemplates.map((policyTemplate) => {
    const isOtelDynamicSignalTypes = policyTemplate.dynamic_signal_types === true;
    // Packages with dynamic_signal_types defer dataset routing to the ES exporter (via scope.name
    // or explicit data_stream.* attrs). Use 'generic.otel' as the default so any fallback lands
    // in the generic OTel data streams rather than a policy-template-named data stream.
    const dataset =
      datasetName ||
      (isOtelDynamicSignalTypes
        ? 'generic.otel'
        : createDefaultDatasetName(packageInfo, policyTemplate));

    let vars = addDatasetVarIfNotPresent(policyTemplate.vars, policyTemplate.name);
    if (
      shouldIncludeUseAPMVar(
        policyTemplate.input,
        dataStreamType || policyTemplate.type,
        policyTemplate.dynamic_signal_types === true
      )
    ) {
      vars = addUseAPMVarIfNotPresent(vars);
    }

    const dataStream: InputOnlyRegistryDataStream = {
      type: dataStreamType || policyTemplate.type,
      dataset,
      title: policyTemplate.title + ' Dataset',
      release: packageInfo.release || 'ga',
      package: packageInfo.name,
      path: dataset,
      elasticsearch: packageInfo.elasticsearch || {},
      streams: [
        {
          input: policyTemplate.input,
          vars,
          ...(policyTemplate.template_paths?.length
            ? { template_paths: policyTemplate.template_paths }
            : { template_path: policyTemplate.template_path }),
          title: policyTemplate.title,
          description: policyTemplate.title,
          enabled: true,
        },
      ],
    };

    dataStream.elasticsearch = {
      ...dataStream.elasticsearch,
      dynamic_dataset: true,
      dynamic_namespace: true,
    };

    return dataStream;
  });
}

// Input only packages must provide a dataset name in order to differentiate their data streams
// here we add the dataset var if it is not defined in the package already.
const addDatasetVarIfNotPresent = (
  vars?: RegistryVarsEntry[],
  datasetName?: string
): RegistryVarsEntry[] => {
  const newVars = vars ?? [];

  const isDatasetAlreadyAdded = newVars.find(
    (varEntry) => varEntry.name === DATA_STREAM_DATASET_VAR.name
  );

  if (isDatasetAlreadyAdded) {
    return newVars;
  } else {
    return [
      ...newVars,
      { ...DATA_STREAM_DATASET_VAR, ...(datasetName && { default: datasetName }) },
    ];
  }
};

export const shouldIncludeUseAPMVar = (
  inputType: string,
  dataStreamType: string | undefined,
  isDynamicSignalTypes: boolean
): boolean =>
  inputType === OTEL_COLLECTOR_INPUT_TYPE &&
  (dataStreamType === dataTypes.Traces || isDynamicSignalTypes);

export const addUseAPMVarIfNotPresent = (vars?: RegistryVarsEntry[]): RegistryVarsEntry[] => {
  const newVars = vars ?? [];

  const isUseAPMVarAlreadyAdded = newVars.find(
    (varEntry) => varEntry.name === DATA_STREAM_USE_APM_VAR.name
  );

  if (isUseAPMVarAlreadyAdded) {
    return newVars;
  } else {
    return [...newVars, DATA_STREAM_USE_APM_VAR];
  }
};

const createDefaultDatasetName = (
  packageInfo: { name: string },
  policyTemplate: { name: string }
): string => packageInfo.name + '.' + policyTemplate.name;

export const hasMultipleEnabledPolicyTemplates = (packagePolicy: NewPackagePolicy): boolean => {
  const enabledPolicyTemplates = new Set(
    packagePolicy?.inputs
      .filter((input) => input.enabled)
      .map((input) => input.policy_template)
      .filter((policyTemplate): policyTemplate is string => !!policyTemplate) ?? []
  );
  return enabledPolicyTemplates.size > 1;
};

export function filterPolicyTemplatesTiles<T>(
  templatesBehavior: string | undefined,
  packagePolicy: T,
  packagePolicyTemplates: T[]
): T[] {
  switch (templatesBehavior || 'all') {
    case 'combined_policy':
      return [packagePolicy];
    case 'individual_policies':
      return [
        ...(packagePolicyTemplates && packagePolicyTemplates.length > 1
          ? packagePolicyTemplates
          : []),
      ];
    default:
      return [
        packagePolicy,
        ...(packagePolicyTemplates && packagePolicyTemplates.length > 1
          ? packagePolicyTemplates
          : []),
      ];
  }
}
