/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Rule } from '../../../containers/detection_engine/rules/types';

export interface EuiBasicTableSortTypes {
  field: string;
  direction: 'asc' | 'desc';
}

export interface EuiBasicTableOnChange {
  page: {
    index: number;
    size: number;
  };
  sort?: EuiBasicTableSortTypes;
}

export interface TableData {
  id: string;
  rule_id: string;
  rule: {
    href: string;
    name: string;
    status: string;
  };
  method: string;
  severity: string;
  lastCompletedRun: string | undefined;
  lastResponse: {
    type: string;
    message?: string;
  };
  tags: string[];
  activate: boolean;
  isLoading: boolean;
  sourceRule: Rule;
}
