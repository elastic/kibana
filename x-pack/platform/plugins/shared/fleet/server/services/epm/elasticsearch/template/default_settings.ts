/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../../../app_context';

// ILM policy names in use by integrations before introduction of the @lifecycle naming convention
export const LEGACY_DEFAULT_ILM_POLICY_NAMES = ['logs', 'metrics', 'synthetics'];
const ILM_POLICY_NAME_SUFFIX = '@lifecycle';

function getILMPolicyName(type: string) {
  return LEGACY_DEFAULT_ILM_POLICY_NAMES.includes(type) ? type : `${type}${ILM_POLICY_NAME_SUFFIX}`;
}

export function buildDefaultSettings({
  ilmPolicy,
  type,
}: {
  type: string;
  ilmPolicy?: string | undefined;
}) {
  const isILMPolicyDisabled = appContextService.getConfig()?.internal?.disableILMPolicies ?? false;

  return {
    index: {
      ...(isILMPolicyDisabled
        ? {}
        : {
            // ILM Policy must be added here, for now point to the default global ILM policy name
            lifecycle: {
              name: ilmPolicy ? ilmPolicy : getILMPolicyName(type),
            },
          }),
    },
  };
}
