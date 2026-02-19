/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isNumber } from 'lodash';
import type { TemplatesFindRequest } from '../../../../common/types/api/template/v1';
import type { TemplatesURLQueryParams } from '../types';

export const templatesUrlStateSerializer = (
  state: TemplatesFindRequest
): TemplatesURLQueryParams => {
  const urlState: TemplatesURLQueryParams = {
    ...state,
    search: state.search ? encodeURIComponent(state.search) : undefined,
  };

  // Filter out empty values
  return Object.entries(urlState).reduce((acc, [key, value]) => {
    // isEmpty returns true for numbers, so we need to handle them separately
    if (isEmpty(value) && !isNumber(value)) {
      return acc;
    }

    return Object.assign(acc, { [key]: value });
  }, {} as TemplatesURLQueryParams);
};
