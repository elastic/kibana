/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { OTEL_COLLECTOR_INPUT_TYPE } from '../../../../../../../../common/constants';
import { isInputOnlyPolicyTemplate } from '../../../../../../../../common/services';
import { ExperimentalFeaturesService } from '../../../../../services';
import type { PackageInfo, PackagePolicyInput } from '../../../../../types';

export const packageInfoHasOtelInputs = (packageInfo: PackageInfo | undefined) => {
  const { enableOtelIntegrations } = ExperimentalFeaturesService.get();

  const isOtelInput = (packageInfo?.policy_templates || []).some(
    (template) => isInputOnlyPolicyTemplate(template) && template.input === OTEL_COLLECTOR_INPUT_TYPE
  );
  return enableOtelIntegrations && isOtelInput;
};

export const packagePolicyHasOtelInputs = (
  packagePolicyInputs: PackagePolicyInput[] | undefined
) => {
  const { enableOtelIntegrations } = ExperimentalFeaturesService.get();
  const isOtelInput = (packagePolicyInputs || []).some(
    (input) => input.type === OTEL_COLLECTOR_INPUT_TYPE
  );
  return enableOtelIntegrations && isOtelInput;
};
