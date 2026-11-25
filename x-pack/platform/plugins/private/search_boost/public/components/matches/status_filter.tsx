/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MATCH_STATUS_LABELS, NO_MATCH_STATUS_REASONS } from '../../translations';
import { createToggleFilter } from '../toggle_filter';

export type MatchStatus = 'applied' | 'outranked';

export const STATUS_FIELD = 'status';

export const {
  ToggleFilter: StatusFilter,
  fieldDefinition: STATUS_FIELD_DEFINITION,
  RowValuesProvider: RowStatusesProvider,
} = createToggleFilter<MatchStatus>({
  fieldName: STATUS_FIELD,
  values: ['applied', 'outranked'],
  labels: MATCH_STATUS_LABELS,
  disabledReasons: NO_MATCH_STATUS_REASONS,
  'data-test-subj': 'searchBoostStatusFilter',
});
