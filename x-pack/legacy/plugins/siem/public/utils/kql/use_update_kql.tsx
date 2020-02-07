/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import { Dispatch } from 'redux';
import { IIndexPattern } from 'src/plugins/data/public';

import { KueryFilterQuery } from '../../store';
import { applyKqlFilterQuery as dispatchApplyTimelineFilterQuery } from '../../store/timeline/actions';
import { convertKueryToElasticSearchQuery } from '../../lib/keury';
import { RefetchKql } from '../../store/inputs/model';

interface UseUpdateKqlProps {
  indexPattern: IIndexPattern;
  kueryFilterQuery: KueryFilterQuery | null;
  kueryFilterQueryDraft: KueryFilterQuery | null;
  storeType: 'timelineType';
  timelineId?: string;
}

export const useUpdateKql = ({
  indexPattern,
  kueryFilterQuery,
  kueryFilterQueryDraft,
  storeType,
  timelineId,
}: UseUpdateKqlProps): RefetchKql => {
  const updateKql: RefetchKql = (dispatch: Dispatch) => {
    if (kueryFilterQueryDraft != null && !isEqual(kueryFilterQuery, kueryFilterQueryDraft)) {
      if (storeType === 'timelineType' && timelineId != null) {
        dispatch(
          dispatchApplyTimelineFilterQuery({
            id: timelineId,
            filterQuery: {
              kuery: kueryFilterQueryDraft,
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
