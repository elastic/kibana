/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectOption } from '@elastic/eui';
import type { ListCustomFieldOption } from '../../../../../common/types/domain';

export const listCustomFieldOptionsToEuiSelectOptions = (
  fieldOptions: ListCustomFieldOption[]
): EuiSelectOption[] =>
  fieldOptions.map((option) => ({
    value: option.key,
    text: option.label,
  }));
