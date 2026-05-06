/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo, RegistryInput, RegistryStream } from '../types';

import { doesPackageHaveIntegrations } from './packages_with_integrations';
import { getNormalizedInputs, isIntegrationPolicyTemplate } from './policy_template';
import {
  buildInputKey,
  getInputEffectiveName,
  getStreamsForInputType,
} from './package_to_package_policy';

export type DocumentationPageInputStream = RegistryStream & {
  data_stream: { type?: string; dataset: string };
};

export type DocumentationPageInput = RegistryInput & {
  key: string;
  policy_template: string;
  streams: DocumentationPageInputStream[];
};

/**
 * Inputs and streams for the Integrations package detail "API reference" tab.
 * Keys and stream resolution match package policy validation and template generation.
 */
export const getDocumentationPageInputs = (
  packageInfo: PackageInfo,
  integration?: string | null
): DocumentationPageInput[] => {
  const hasIntegrations = doesPackageHaveIntegrations(packageInfo);
  const result: DocumentationPageInput[] = [];

  packageInfo.policy_templates?.forEach((policyTemplate) => {
    if (integration && policyTemplate.name !== integration) {
      return;
    }

    const normalizedInputs = getNormalizedInputs(policyTemplate);
    const dataStreamPaths =
      isIntegrationPolicyTemplate(policyTemplate) && policyTemplate.data_streams?.length
        ? policyTemplate.data_streams
        : [];

    normalizedInputs.forEach((input) => {
      const effectiveName = getInputEffectiveName(input);
      const key = buildInputKey(effectiveName, policyTemplate.name, hasIntegrations);
      const streams = getStreamsForInputType(effectiveName, packageInfo, dataStreamPaths);

      result.push({
        ...input,
        key,
        policy_template: policyTemplate.name,
        streams,
      });
    });
  });

  return result;
};
