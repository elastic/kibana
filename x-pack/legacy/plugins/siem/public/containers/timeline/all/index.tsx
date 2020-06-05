/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';
import { getOr } from 'lodash/fp';
import memoizeOne from 'memoize-one';

import { Query } from 'react-apollo';

import { ApolloQueryResult } from 'apollo-client';
import { OpenTimelineResult } from '../../../components/open_timeline/types';
import {
  GetAllTimeline,
  PageInfoTimeline,
  SortTimeline,
  TimelineResult,
} from '../../../graphql/types';
import { allTimelinesQuery } from './index.gql_query';

export interface AllTimelinesArgs {
  timelines: OpenTimelineResult[];
  loading: boolean;
  totalCount: number;
  refetch: () => void;
}

export interface AllTimelinesVariables {
  onlyUserFavorite: boolean;
  pageInfo: PageInfoTimeline;
  search: string;
  sort: SortTimeline;
}

interface OwnProps extends AllTimelinesVariables {
  children?: (args: AllTimelinesArgs) => React.ReactNode;
}

type Refetch = (
  variables: GetAllTimeline.Variables | undefined
) => Promise<ApolloQueryResult<GetAllTimeline.Query>>;

const getAllTimeline = memoizeOne(
  (variables: string, timelines: TimelineResult[]): OpenTimelineResult[] =>
    timelines.map((timeline) => ({
      created: timeline.created,
      description: timeline.description,
      eventIdToNoteIds:
        timeline.eventIdToNoteIds != null
          ? timeline.eventIdToNoteIds.reduce((acc, note) => {
              if (note.eventId != null) {
                const notes = getOr([], note.eventId, acc);
                return { ...acc, [note.eventId]: [...notes, note.noteId] };
              }
              return acc;
            }, {})
          : null,
      favorite: timeline.favorite,
      noteIds: timeline.noteIds,
      notes:
        timeline.notes != null
          ? timeline.notes.map((note) => ({ ...note, savedObjectId: note.noteId }))
          : null,
      pinnedEventIds:
        timeline.pinnedEventIds != null
          ? timeline.pinnedEventIds.reduce(
              (acc, pinnedEventId) => ({ ...acc, [pinnedEventId]: true }),
              {}
            )
          : null,
      savedObjectId: timeline.savedObjectId,
      title: timeline.title,
      updated: timeline.updated,
      updatedBy: timeline.updatedBy,
    }))
);

const AllTimelinesQueryComponent: React.FC<OwnProps> = ({
  children,
  onlyUserFavorite,
  pageInfo,
  search,
  sort,
}) => {
  const variables: GetAllTimeline.Variables = {
    onlyUserFavorite,
    pageInfo,
    search,
    sort,
  };
  const handleRefetch = useCallback((refetch: Refetch) => refetch(variables), [variables]);

  return (
    <Query<GetAllTimeline.Query, GetAllTimeline.Variables>
      query={allTimelinesQuery}
      fetchPolicy="network-only"
      notifyOnNetworkStatusChange
      variables={variables}
    >
      {({ data, loading, refetch }) =>
        children!({
          loading,
          refetch: handleRefetch.bind(null, refetch),
          totalCount: getOr(0, 'getAllTimeline.totalCount', data),
          timelines: getAllTimeline(
            JSON.stringify(variables),
            getOr([], 'getAllTimeline.timeline', data)
          ),
        })
      }
    </Query>
  );
};

export const AllTimelinesQuery = React.memo(AllTimelinesQueryComponent);
