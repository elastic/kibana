/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isInputOnlyPolicyTemplate } from '../../../../../../../common/services';

import type { PackageInfo, UpdatePackagePolicy } from '../../../../types';

export const getNewSecrets = ({
  packageInfo,
  packagePolicy,
}: {
  packageInfo: PackageInfo;
  packagePolicy: UpdatePackagePolicy;
}) => {
  const result = [];

  for (const packageVar of packageInfo.vars ?? []) {
    const isVarSecretOnPolicy = packagePolicy.vars?.[packageVar.name]?.value?.isSecretRef;

    if (packageVar.secret && !isVarSecretOnPolicy) {
      result.push(packageVar);
    }
  }

  for (const policyTemplate of packageInfo.policy_templates ?? []) {
    if (isInputOnlyPolicyTemplate(policyTemplate)) {
      for (const packageVar of policyTemplate.vars ?? []) {
        const isVarSecretOnPolicy =
          packagePolicy.inputs?.[0]?.vars?.[packageVar.name]?.value?.isSecretRef;

        if (packageVar.secret && !isVarSecretOnPolicy) {
          result.push(packageVar);
        }
      }
    } else {
      for (const input of policyTemplate.inputs ?? []) {
        for (const packageVar of input.vars ?? []) {
          const isVarSecretOnPolicy =
            packagePolicy.inputs?.[0]?.vars?.[packageVar.name]?.value?.isSecretRef;

          if (packageVar.secret && !isVarSecretOnPolicy) {
            result.push(packageVar);
          }
        }
      }
    }
  }

  return result;
};
