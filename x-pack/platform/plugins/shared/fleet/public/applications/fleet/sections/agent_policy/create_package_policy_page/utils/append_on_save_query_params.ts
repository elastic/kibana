/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parse, stringify } from 'query-string';

import type {
  CreatePackagePolicyRouteState,
  OnSaveQueryParamOpts,
  PackagePolicy,
  OnSaveQueryParamKeys,
} from '../../../../types';
import type { AgentlessPolicy } from '../../../../../../../common';

export function appendOnSaveQueryParamsToPath({
  path,
  policy,
  paramsToApply,
  mappingOptions = {},
}: {
  path: string;
  policy: PackagePolicy | AgentlessPolicy;
  paramsToApply: OnSaveQueryParamKeys[];
  mappingOptions?: CreatePackagePolicyRouteState['onSaveQueryParams'];
}) {
  const [basePath, queryStringIn] = path.split('?');
  const queryParams = parse(queryStringIn);
  const policyId = 'policy_ids' in policy ? policy.policy_ids[0] : policy.id; // TODO handle multiple

  paramsToApply.forEach((paramName) => {
    const paramOptions = mappingOptions[paramName];
    if (paramOptions) {
      const [paramKey, paramValue] = createQueryParam(
        paramName,
        paramOptions,
        policyId || undefined
      );
      if (paramKey && paramValue) {
        queryParams[paramKey] = paramValue;
      }
    }
  });

  const queryString = stringify(queryParams);

  return basePath + (queryString ? `?${queryString}` : '');
}

function createQueryParam(
  name: string,
  opts: OnSaveQueryParamOpts,
  policyId?: string
): [string?, string?] {
  if (!opts) {
    return [];
  }
  if (typeof opts === 'boolean' && opts) {
    return [name, 'true'];
  }

  const paramKey = opts.renameKey ? opts.renameKey : name;
  const paramValue = opts.policyIdAsValue && policyId ? policyId : 'true';

  return [paramKey, paramValue];
}
