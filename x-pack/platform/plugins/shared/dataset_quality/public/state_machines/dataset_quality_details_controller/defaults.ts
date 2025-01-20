/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_DATEPICKER_REFRESH,
  DEFAULT_FAILED_DOCS_ERROR_SORT_DIRECTION,
  DEFAULT_FAILED_DOCS_ERROR_SORT_FIELD,
  DEFAULT_QUALITY_ISSUE_SORT_DIRECTION,
  DEFAULT_QUALITY_ISSUE_SORT_FIELD,
  DEFAULT_TIME_RANGE,
} from '../../../common/constants';
import { DefaultDatasetQualityDetailsContext, QualityIssueType } from './types';

export const DEFAULT_CONTEXT: DefaultDatasetQualityDetailsContext = {
  qualityIssues: {
    table: {
      page: 0,
      rowsPerPage: 10,
      sort: {
        field: DEFAULT_QUALITY_ISSUE_SORT_FIELD,
        direction: DEFAULT_QUALITY_ISSUE_SORT_DIRECTION,
      },
    },
  },
  failedDocsErrors: {
    table: {
      page: 0,
      rowsPerPage: 10,
      sort: {
        field: DEFAULT_FAILED_DOCS_ERROR_SORT_FIELD,
        direction: DEFAULT_FAILED_DOCS_ERROR_SORT_DIRECTION,
      },
    },
  },
  isIndexNotFoundError: false,
  timeRange: {
    ...DEFAULT_TIME_RANGE,
    refresh: DEFAULT_DATEPICKER_REFRESH,
  },
  showCurrentQualityIssues: false,
  qualityIssuesChart: 'degraded' as QualityIssueType,
};
