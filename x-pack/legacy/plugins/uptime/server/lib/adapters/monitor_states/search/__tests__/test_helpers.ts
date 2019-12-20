/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CursorPagination } from '../../adapter_types';
import { CursorDirection, SortOrder } from '../../../../../../common/graphql/types';
import { QueryContext } from '../query_context';

export const prevPagination = (key: any): CursorPagination => {
  return {
    cursorDirection: CursorDirection.BEFORE,
    sortOrder: SortOrder.ASC,
    cursorKey: key,
  };
};
export const nextPagination = (key: any): CursorPagination => {
  return {
    cursorDirection: CursorDirection.AFTER,
    sortOrder: SortOrder.ASC,
    cursorKey: key,
  };
};
export const simpleQueryContext = (): QueryContext => {
  return new QueryContext(undefined, '', '', nextPagination('something'), undefined, 0, '');
};
