/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import { EuiCode } from '@elastic/eui';
import React from 'react';

import * as i18n from './translations';
import type { ErrorSummary } from '../../../types';

export const EMPTY_PLACEHOLDER = '--';

export const ERRORS_CONTAINER_MAX_WIDTH = 600; // px
export const ERRORS_CONTAINER_MIN_WIDTH = 450; // px

export const getErrorsViewerTableColumns = (): Array<EuiTableFieldDataColumnType<ErrorSummary>> => [
  {
    field: 'pattern',
    name: i18n.PATTERN,
    sortable: true,
    truncateText: false,
    width: '25%',
  },
  {
    field: 'indexName',
    name: i18n.INDEX,
    render: (indexName) => (indexName != null && indexName !== '' ? indexName : EMPTY_PLACEHOLDER),
    sortable: false,
    truncateText: false,
    width: '25%',
  },
  {
    field: 'error',
    name: i18n.ERROR,
    render: (errorText) => <EuiCode>{errorText}</EuiCode>,
    sortable: false,
    truncateText: false,
    width: '50%',
  },
];
