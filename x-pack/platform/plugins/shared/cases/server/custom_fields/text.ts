/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isString } from 'lodash';
import type { CustomFieldValue } from '../../common/types/domain';
import { CasesCustomFieldMappingType } from './types';

export const getCasesTextCustomField = () => ({
  isFilterable: false,
  isSortable: false,
  savedObjectMappingType: CasesCustomFieldMappingType.TEXT,
  validateFilteringValues: (values: CustomFieldValue[]) => {
    values.forEach((value) => {
      if (value !== null && !isString(value)) {
        throw Boom.badRequest(`Unsupported filtering value for custom field of type text.`);
      }
    });
  },
});
