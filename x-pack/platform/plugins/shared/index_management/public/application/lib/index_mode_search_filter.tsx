/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchFilterConfig } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  STANDARD_INDEX_MODE,
  LOGSDB_INDEX_MODE,
  TIME_SERIES_MODE,
  LOOKUP_INDEX_MODE,
  VECTOR_DB_INDEX_MODE,
} from '../../../common/constants';
import { indexModeLabels } from './index_mode_labels';

const INDEX_MODE_FILTER_VALUES = [
  STANDARD_INDEX_MODE,
  LOGSDB_INDEX_MODE,
  TIME_SERIES_MODE,
  LOOKUP_INDEX_MODE,
  VECTOR_DB_INDEX_MODE,
] as const;

export const indexModeSearchFilter: SearchFilterConfig = {
  type: 'field_value_selection',
  field: 'mode',
  name: i18n.translate('xpack.idxMgmt.indexTable.indexModeFilterLabel', {
    defaultMessage: 'Index mode',
  }),
  multiSelect: 'or',
  autoSortOptions: false,
  options: INDEX_MODE_FILTER_VALUES.map((value) => ({
    value,
    name: indexModeLabels[value],
  })),
};
