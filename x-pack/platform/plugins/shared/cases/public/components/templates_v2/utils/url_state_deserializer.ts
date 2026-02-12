/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TemplatesFindRequest } from '../../../../common/types/api/template/v1';
import type { TemplatesURLQueryParams } from '../types';
import { DEFAULT_QUERY_PARAMS } from '../constants';
import { sanitizeState } from './sanitize_state';
import { stringToIntegerWithDefault } from '.';

export const templatesUrlStateDeserializer = (
  urlParamsMap: TemplatesURLQueryParams
): Partial<TemplatesFindRequest> => {
  const result: Partial<TemplatesFindRequest> = {};

  for (const [key, value] of Object.entries(urlParamsMap)) {
    if (Object.hasOwn(DEFAULT_QUERY_PARAMS, key)) {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  const { page, perPage, search, ...rest } = result;

  const parsed: Partial<TemplatesFindRequest> = { ...rest };

  if (page !== undefined) {
    parsed.page = stringToIntegerWithDefault(page, DEFAULT_QUERY_PARAMS.page);
  }

  if (perPage !== undefined) {
    parsed.perPage = stringToIntegerWithDefault(perPage, DEFAULT_QUERY_PARAMS.perPage);
  }

  if (search !== undefined) {
    parsed.search = decodeURIComponent(search);
  }

  return sanitizeState(parsed);
};
