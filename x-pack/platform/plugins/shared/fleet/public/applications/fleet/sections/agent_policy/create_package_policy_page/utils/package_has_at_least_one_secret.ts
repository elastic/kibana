/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isInputOnlyPolicyTemplate } from '../../../../../../../common/services';
import type { PackageInfo } from '../../../../types';

export const packageHasAtLeastOneSecret = ({ packageInfo }: { packageInfo: PackageInfo }) => {
  if (packageInfo.vars?.some((v) => v.secret)) {
    return true;
  }

  for (const policyTemplate of packageInfo.policy_templates ?? []) {
    if (isInputOnlyPolicyTemplate(policyTemplate)) {
      if (policyTemplate.vars?.some((v) => v.secret)) {
        return true;
      }
    } else {
      for (const input of policyTemplate.inputs ?? []) {
        if (input.vars?.some((v) => v.secret)) {
          return true;
        }
      }
    }
  }

  return false;
};
