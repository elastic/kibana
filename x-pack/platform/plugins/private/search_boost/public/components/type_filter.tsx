/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoostProfileType } from '../../common/types';
import { PROFILE_TYPE_LABELS } from '../translations';
import { createToggleFilter } from './toggle_filter';

export const TYPE_FIELD = 'type';

export const {
  ToggleFilter: TypeFilter,
  fieldDefinition: TYPE_FIELD_DEFINITION,
  RowValuesProvider: RowTypesProvider,
} = createToggleFilter<BoostProfileType>({
  fieldName: TYPE_FIELD,
  values: ['indices', 'data_streams'],
  labels: PROFILE_TYPE_LABELS,
  'data-test-subj': 'searchBoostTypeFilter',
});
