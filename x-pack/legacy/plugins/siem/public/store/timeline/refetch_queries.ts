/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { allTimelinesQuery } from '../../containers/timeline/all/index.gql_query';
import { Direction } from '../../graphql/types';
import { DEFAULT_SORT_FIELD } from '../../components/open_timeline/constants';

export const refetchQueries = [
  {
    query: allTimelinesQuery,
    variables: {
      search: '',
      pageInfo: {
        pageIndex: 1,
        pageSize: 10,
      },
      sort: { sortField: DEFAULT_SORT_FIELD, sortOrder: Direction.desc },
      onlyUserFavorite: false,
    },
  },
];
