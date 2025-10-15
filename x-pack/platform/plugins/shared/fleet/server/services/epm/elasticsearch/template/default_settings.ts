/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../../../app_context';

export function buildDefaultSettings({
  ilmPolicy,
  type,
  isOtelInputType,
}: {
  type: string;
  ilmPolicy?: string | undefined;
  isOtelInputType?: boolean;
}) {
  const isILMPolicyDisabled = appContextService.getConfig()?.internal?.disableILMPolicies ?? false;
  const defaultIlmPolicy = isOtelInputType ? `${type}@lifecycle` : type;

  return {
    index: {
      ...(isILMPolicyDisabled
        ? {}
        : {
            // ILM Policy must be added here, for now point to the default global ILM policy name
            lifecycle: {
              name: ilmPolicy ? ilmPolicy : defaultIlmPolicy,
            },
          }),
    },
  };
}
