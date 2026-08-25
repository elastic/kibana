/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDescriptionFieldsFn } from '@kbn/triggers-actions-ui-plugin/public/types';

export const getDescriptionFields: GetDescriptionFieldsFn = ({ rule, prebuildFields }) => {
  if (!rule || !prebuildFields) {
    return [];
  }

  if (rule.params.indexPattern && typeof rule.params.indexPattern === 'string') {
    return [prebuildFields.indexPattern([rule.params.indexPattern])];
  }

  if (rule.params.filterQueryText && typeof rule.params.filterQueryText === 'string') {
    return [prebuildFields.customQuery(rule.params.filterQueryText)];
  }

  return [];
};
