/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import { EuiCode } from '@elastic/eui';
import React from 'react';

import type { ErrorSummary } from '../../../../../types';
import { INDEX } from '../../../../../translations';
import { ERROR, PATTERN } from '../../../translations';

export const EMPTY_PLACEHOLDER = '--';

export const ERRORS_CONTAINER_MAX_WIDTH = 600; // px
export const ERRORS_CONTAINER_MIN_WIDTH = 450; // px

export const getErrorsViewerTableColumns = (): Array<EuiTableFieldDataColumnType<ErrorSummary>> => [
  {
    field: 'pattern',
    name: PATTERN,
    sortable: true,
    truncateText: false,
    width: '25%',
  },
  {
    field: 'indexName',
    name: INDEX,
    render: (indexName: string | null) =>
      indexName != null && indexName !== '' ? (
        <span data-test-subj="indexName">{indexName}</span>
      ) : (
        <span data-test-subj="emptyPlaceholder">{EMPTY_PLACEHOLDER}</span>
      ),
    sortable: false,
    truncateText: false,
    width: '25%',
  },
  {
    field: 'error',
    name: ERROR,
    render: (errorText) => <EuiCode data-test-subj="error">{errorText}</EuiCode>,
    sortable: false,
    truncateText: false,
    width: '50%',
  },
];
