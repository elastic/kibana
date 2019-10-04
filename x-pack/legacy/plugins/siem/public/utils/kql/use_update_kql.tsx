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
import { applyNetworkFilterQuery as dispatchApplyNetworkFilterQuery } from '../../store/network/actions';
import { applyKqlFilterQuery as dispatchApplyTimelineFilterQuery } from '../../store/timeline/actions';
import { convertKueryToElasticSearchQuery } from '../../lib/keury';
import { RefetchKql } from '../../store/inputs/model';
import { NetworkType } from '../../store/network/model';

interface UseUpdateKqlProps {
  indexPattern: StaticIndexPattern;
  kueryFilterQuery: KueryFilterQuery | null;
  kueryFilterQueryDraft: KueryFilterQuery | null;
  storeType: 'networkType' | 'hostsType' | 'timelineType';
  type: HostsType | NetworkType | null;
  timelineId?: string;
}

export const useUpdateKql = ({
  indexPattern,
  kueryFilterQuery,
  kueryFilterQueryDraft,
  storeType,
  timelineId,
  type,
}: UseUpdateKqlProps): RefetchKql => {
  const updateKql: RefetchKql = (dispatch: Dispatch) => {
    if (kueryFilterQueryDraft != null && !isEqual(kueryFilterQuery, kueryFilterQueryDraft)) {
      if (storeType === 'hostsType' && (type === HostsType.details || type === HostsType.page)) {
        dispatch(
          dispatchApplyHostsFilterQuery({
            filterQuery: {
              kuery: {
                kind: 'kuery',
                expression: kueryFilterQueryDraft.expression,
              },
              serializedQuery: convertKueryToElasticSearchQuery(
                kueryFilterQueryDraft.expression,
                indexPattern
              ),
            },
            hostsType: type,
          })
        );
      } else if (
        storeType === 'networkType' &&
        (type === NetworkType.details || type === NetworkType.page)
      ) {
        dispatch(
          dispatchApplyNetworkFilterQuery({
            filterQuery: {
              kuery: {
                kind: 'kuery',
                expression: kueryFilterQueryDraft.expression,
              },
              serializedQuery: convertKueryToElasticSearchQuery(
                kueryFilterQueryDraft.expression,
                indexPattern
              ),
            },
            networkType: type,
          })
        );
      } else if (storeType === 'timelineType' && timelineId != null) {
        dispatch(
          dispatchApplyTimelineFilterQuery({
            id: timelineId,
            filterQuery: {
              kuery: {
                kind: 'kuery',
                expression: kueryFilterQueryDraft.expression,
              },
              serializedQuery: convertKueryToElasticSearchQuery(
                kueryFilterQueryDraft.expression,
                indexPattern
              ),
            },
          })
        );
      }

      return true;
    }
    return false;
  };
  return updateKql;
};
