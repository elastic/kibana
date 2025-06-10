/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  alertDeleteCategoryIds,
  type AlertDeleteCategoryIds,
} from '../../../../../common/constants/alert_delete';

export const getCategoryIds = (
  input: AlertDeleteCategoryIds | AlertDeleteCategoryIds[] | undefined
) => {
  if (!input)
    return [
      alertDeleteCategoryIds.MANAGEMENT,
      alertDeleteCategoryIds.SECURITY_SOLUTION,
      alertDeleteCategoryIds.OBSERVABILITY,
    ];

  // Accepting single category id or array of category ids because
  // sending an array with just one element is decoded as a simple string
  return Array.isArray(input) ? input : [input];
};
