/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { safeDecode } from '@kbn/rison';
import { isPlainObject } from 'lodash';
import { TEMPLATES_STATE_URL_KEY } from '../constants';
import type { TemplatesURLQueryParams } from '../types';

export const parseUrlParams = (urlParams: URLSearchParams): TemplatesURLQueryParams => {
  const templatesParams = urlParams.get(TEMPLATES_STATE_URL_KEY);

  if (!templatesParams) {
    return {};
  }

  const parsedTemplatesParams = safeDecode(templatesParams);

  if (!parsedTemplatesParams || !isPlainObject(parsedTemplatesParams)) {
    return {};
  }

  return parsedTemplatesParams as TemplatesURLQueryParams;
};
