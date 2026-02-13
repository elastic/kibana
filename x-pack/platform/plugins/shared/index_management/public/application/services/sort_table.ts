/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy, get } from 'lodash';
import type { Index } from '../../../common';
import type { ExtensionsService } from '../../services';

type SortField =
  | 'name'
  | 'status'
  | 'health'
  | 'primary'
  | 'replica'
  | 'documents'
  | 'size'
  | 'primary_size'
  | 'data_stream';

type SortFunction = (index: Index) => any;

const numericSort =
  (fieldName: SortField): SortFunction =>
  (item) =>
    Number(item[fieldName]);

const getSorters = (extensionsService?: ExtensionsService) => {
  const sorters = {
    primary: numericSort('primary'),
    replica: numericSort('replica'),
    documents: numericSort('documents'),
  } as any;
  const columns = extensionsService?.columns ?? [];
  for (const column of columns) {
    if (column.sort) {
      sorters[column.fieldName] = column.sort;
    }
  }
  return sorters;
};

export const sortTable = (
  array: Index[] = [],
  sortField: SortField | string,
  isSortAscending: boolean,
  extensionsService?: ExtensionsService
) => {
  const sorters = getSorters(extensionsService);
  let sorter = sorters[sortField];
  if (!sorter) {
    sorter = (index: Index) => get(index, sortField);
  }
  const sorted = sortBy(array, sorter);
  return isSortAscending ? sorted : sorted.reverse();
};
