/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { OTEL_COLLECTOR_INPUT_TYPE } from '../constants';
import type { PackageInfo, PackagePolicyInput } from '../types';

import { isInputOnlyPolicyTemplate } from './policy_template';

export const OTEL_INPUTS_MINIMUM_VERSION = '9.2.0';

export const packageInfoHasOtelInputs = (packageInfo: PackageInfo | undefined) =>
  (packageInfo?.policy_templates || []).some(
    (template) =>
      isInputOnlyPolicyTemplate(template) && template.input === OTEL_COLLECTOR_INPUT_TYPE
  );

export const packagePolicyHasOtelInputs = (packagePolicyInputs: PackagePolicyInput[] | undefined) =>
  (packagePolicyInputs || []).some(
    (input) => input.type === OTEL_COLLECTOR_INPUT_TYPE && input.enabled
  );

export const packageInfoHasMultipleSignalTypes = (
  packageInfo: PackageInfo | undefined
): boolean => {
  if (!packageInfo) {
    return false;
  }
  // Check if package has available_types defined with more than one signal type
  const availableTypes = packageInfo.available_types;
  return (
    Array.isArray(availableTypes) &&
    availableTypes.length > 1 &&
    packageInfoHasOtelInputs(packageInfo)
  );
};
