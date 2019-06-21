/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';

import memoizeOne from 'memoize-one';
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

export class AllTimelinesQuery extends React.PureComponent<OwnProps> {
  private memoizedAllTimeline: (
    variables: string,
    timelines: TimelineResult[]
  ) => OpenTimelineResult[];

  constructor(props: OwnProps) {
    super(props);
    this.memoizedAllTimeline = memoizeOne(this.getAllTimeline);
  }

  public render() {
    const { children, onlyUserFavorite, pageInfo, search, sort } = this.props;
    const variables: GetAllTimeline.Variables = {
      onlyUserFavorite,
      pageInfo,
      search,
      sort,
    };
    return (
      <Query<GetAllTimeline.Query, GetAllTimeline.Variables>
        query={allTimelinesQuery}
        fetchPolicy="network-only"
        notifyOnNetworkStatusChange
        variables={variables}
      >
        {({ data, loading }) => {
          return children!({
            loading,
            totalCount: getOr(0, 'getAllTimeline.totalCount', data),
            timelines: this.memoizedAllTimeline(
              JSON.stringify(variables),
              getOr([], 'getAllTimeline.timeline', data)
            ),
          });
        }}
      </Query>
    );
  }

  private getAllTimeline = (
    variables: string,
    timelines: TimelineResult[]
  ): OpenTimelineResult[] => {
    return timelines.map(timeline => ({
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
          ? timeline.notes.map(note => ({ ...note, savedObjectId: note.noteId }))
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
    }));
  };
}
