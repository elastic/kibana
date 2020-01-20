/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface CondensedCheck {
  childStatuses: CondensedCheckStatus[];
  location: string | null;
  status: string;
  timestamp: string;
}

export interface CondensedCheckStatus {
  ip?: string | null;
  status: string;
  timestamp: string;
}

export interface Criteria {
  page?: {
    index: number;
    size: number;
  };
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export interface ExpandedRowMap {
  [key: string]: JSX.Element;
}

export interface Pagination {
  hidePerPageOptions?: boolean;
  initialPageSize: number;
  pageIndex: number;
  pageSize: number;
  pageSizeOptions: number[];
  totalItemCount: number;
}
