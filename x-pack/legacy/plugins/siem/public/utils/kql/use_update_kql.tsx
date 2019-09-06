/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import { Dispatch } from 'redux';
import { StaticIndexPattern } from 'ui/index_patterns';

import { KueryFilterQuery } from '../../store';
import { HostsType } from '../../store/hosts/model';
import { applyHostsFilterQuery as dispatchApplyHostsFilterQuery } from '../../store/hosts/actions';

import { convertKueryToElasticSearchQuery } from '../../lib/keury';
import { RefetchKql } from '../../store/inputs/model';

interface UseUpdateKqlProps {
  indexPattern: StaticIndexPattern;
  kueryFilterQuery: KueryFilterQuery | null;
  KueryFilterQueryDraft: KueryFilterQuery | null;
  storeType: 'networkType' | 'hostsType';
  type: HostsType;
}

export const useUpdateKql = ({
  indexPattern,
  kueryFilterQuery,
  KueryFilterQueryDraft,
  storeType,
  type,
}: UseUpdateKqlProps): RefetchKql => {
  const updateKql: RefetchKql = (dispatch: Dispatch) => {
    if (KueryFilterQueryDraft != null && !isEqual(kueryFilterQuery, KueryFilterQueryDraft)) {
      if (storeType === 'hostsType')
        dispatch(
          dispatchApplyHostsFilterQuery({
            filterQuery: {
              kuery: {
                kind: 'kuery',
                expression: KueryFilterQueryDraft.expression,
              },
              serializedQuery: convertKueryToElasticSearchQuery(
                KueryFilterQueryDraft.expression,
                indexPattern
              ),
            },
            hostsType: type,
          })
        );
      return true;
    }
    return false;
  };
  return updateKql;
};
