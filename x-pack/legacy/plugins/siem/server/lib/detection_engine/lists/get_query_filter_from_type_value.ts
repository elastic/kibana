/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Type } from '../routes/schemas/common/schemas';

export type QueryFilterType = Array<
  { term: { list_id: string } } | { terms: { ip: string[] } } | { terms: { keyword: string[] } }
>;

export const getQueryFilterFromTypeValue = ({
  type,
  value,
  listId,
}: {
  type: Type;
  value: string[];
  listId: string;
}): QueryFilterType => {
  const filter: QueryFilterType = [{ term: { list_id: listId } }];
  switch (type) {
    case 'ip': {
      return [...filter, ...[{ terms: { ip: value } }]];
    }
    case 'keyword': {
      return [...filter, ...[{ terms: { keyword: value } }]];
    }
  }
};
