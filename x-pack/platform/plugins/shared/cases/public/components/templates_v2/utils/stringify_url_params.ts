/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { TEMPLATES_STATE_URL_KEY } from '../constants';
import type { TemplatesURLQueryParams } from '../types';

export const stringifyUrlParams = (
  templatesUrlParams: TemplatesURLQueryParams,
  currentSearch: string = ''
): string => {
  const encodedUrlParams = encode({ ...templatesUrlParams });

  const searchUrlParams = new URLSearchParams(decodeURIComponent(currentSearch));

  searchUrlParams.delete(TEMPLATES_STATE_URL_KEY);
  const templatesQueryParam = `${TEMPLATES_STATE_URL_KEY}=${encodedUrlParams}`;

  return searchUrlParams.size > 0
    ? `${templatesQueryParam}&${searchUrlParams.toString()}`
    : templatesQueryParam;
};
