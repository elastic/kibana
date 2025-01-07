/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocatorUrl } from '@kbn/share-plugin/public';
import { useAppContext } from '../app_context';
import { ILM_LOCATOR_ID } from '../constants';

export const useIlmLocator = (
  page: 'policies_list' | 'policy_edit' | 'policy_create',
  policyName?: string
): string => {
  const ctx = useAppContext();
  const locator = policyName === undefined ? null : ctx.url.locators.get(ILM_LOCATOR_ID)!;
  const url = useLocatorUrl(locator, { page, policyName }, {}, [page, policyName]);

  return url;
};
