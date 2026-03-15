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
  InstallablePackage,
  NewPackagePolicy,
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

const DATA_STREAM_USE_APM_VAR: RegistryVarsEntry = {
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
  };

  return [input];
};

export const getNormalizedDataStreams = (
  packageInfo: PackageInfo | InstallablePackage,
  datasetName?: string,
  dataStreamType?: string
): RegistryDataStream[] => {
  if (packageInfo.type !== 'input') {
    return packageInfo.data_streams || [];
  }

  const policyTemplates = packageInfo.policy_templates as RegistryPolicyInputOnlyTemplate[];

  if (!policyTemplates || policyTemplates.length === 0) {
    return [];
  }

  return policyTemplates.map((policyTemplate) => {
    const dataset = datasetName || createDefaultDatasetName(packageInfo, policyTemplate);

    let vars = addDatasetVarIfNotPresent(policyTemplate.vars, policyTemplate.name);
    const isOtelTraces = (dataStreamType || policyTemplate.type) === dataTypes.Traces;
    const isOtelDynamicSignalTypes = policyTemplate.dynamic_signal_types === true;
    if (
      policyTemplate.input === OTEL_COLLECTOR_INPUT_TYPE &&
      (isOtelTraces || isOtelDynamicSignalTypes)
    ) {
      vars = addUseAPMVarIfNotPresent(vars);
    }

    const dataStream: RegistryDataStream = {
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
          template_path: policyTemplate.template_path,
          title: policyTemplate.title,
          description: policyTemplate.title,
          enabled: true,
        },
      ],
    };

    if (packageInfo.type === 'input') {
      dataStream.elasticsearch = {
        ...dataStream.elasticsearch,
        ...{
          dynamic_dataset: true,
          dynamic_namespace: true,
        },
      };
    }

    return dataStream;
  });
};

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

const addUseAPMVarIfNotPresent = (vars?: RegistryVarsEntry[]): RegistryVarsEntry[] => {
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
