/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { ALL_CASES_STATE_URL_KEY, LEGACY_SUPPORTED_STATE_KEYS } from '../constants';
import type { AllCasesURLQueryParams } from '../types';

export function stringifyUrlParams(
  allCasesUrlParams: AllCasesURLQueryParams,
  currentSearch: string = ''
): string {
  const encodedUrlParams = encode({ ...allCasesUrlParams });

  const searchUrlParams = removeLegacyStateFromUrl(
    new URLSearchParams(decodeURIComponent(currentSearch))
  );

  searchUrlParams.delete(ALL_CASES_STATE_URL_KEY);
  const casesQueryParam = `${ALL_CASES_STATE_URL_KEY}=${encodedUrlParams}`;

  return searchUrlParams.size > 0
    ? `${casesQueryParam}&${searchUrlParams.toString()}`
    : casesQueryParam;
}

const removeLegacyStateFromUrl = (urlParams: URLSearchParams): URLSearchParams => {
  const newUrlParams = new URLSearchParams(urlParams);
  LEGACY_SUPPORTED_STATE_KEYS.forEach((key) => newUrlParams.delete(key));

  return newUrlParams;
};
