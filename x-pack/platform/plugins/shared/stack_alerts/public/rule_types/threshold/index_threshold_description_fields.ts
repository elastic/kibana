/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDescriptionFieldsFn } from '@kbn/triggers-actions-ui-plugin/public/types';
import { indexParamToArray } from './expression';
import type { IndexThresholdRuleParams } from './types';

export const getDescriptionFields: GetDescriptionFieldsFn<IndexThresholdRuleParams> = ({
  rule,
  prebuildFields,
}) => {
  if (!rule || !prebuildFields) return [];

  const normalizedIndex = indexParamToArray(rule.params.index);
  return [prebuildFields.indexPattern(normalizedIndex)];
};
