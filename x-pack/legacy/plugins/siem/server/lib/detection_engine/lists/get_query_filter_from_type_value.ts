/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type QueryFilterType = Array<
  { term: { list_id: string } } | { terms: { ip: string[] } } | { terms: { string: string[] } }
>;

export const getQueryFilterFromTypeValue = ({
  type,
  value,
  listId,
}: {
  type: string; // TODO: Use an enum here
  value: string[];
  listId: string;
}): QueryFilterType => {
  let filter: QueryFilterType = [{ term: { list_id: listId } }];
  switch (type) {
    case 'ip': {
      filter = [...filter, ...[{ terms: { ip: value } }]];
      break;
    }
    case 'string': {
      filter = [...filter, ...[{ terms: { string: value } }]];
      break;
    }
    default: {
      // TODO: Once we use an enum this should go away
      throw new Error('Default should not be reached');
    }
  }
  return filter;
};
