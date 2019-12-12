/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IIndexPattern } from 'src/plugins/data/common';
import { QueryTabBodyProps } from '../../pages/hosts/navigation/types';
import { UpdateDateRange } from '../charts/common';
import { InspectQuery, Refetch } from '../../store/inputs/model';
import { NarrowDateRange } from '../ml/types';

interface PageFilterDsl {
  exists: {
    field: string;
  };
}

export type AlertsComponentPageFilterDsl = Array<{
  bool: {
    should: PageFilterDsl[];
    minimum_should_match: 1;
  };
}>;

export type AlertsComponentsQueryProps = QueryTabBodyProps & {
  deleteQuery?: ({ id }: { id: string }) => void;
  indexPattern: IIndexPattern;
  narrowDateRange?: NarrowDateRange;
  setQuery: ({
    id,
    inspect,
    loading,
    refetch,
  }: {
    id: string;
    inspect: InspectQuery | null;
    loading: boolean;
    refetch: Refetch;
  }) => void;
  skip: boolean;
  updateDateRange?: UpdateDateRange;
};
