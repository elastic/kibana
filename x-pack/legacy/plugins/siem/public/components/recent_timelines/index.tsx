/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ApolloClient from 'apollo-client';
import { EuiHorizontalRule, EuiLink, EuiText } from '@elastic/eui';
import React, { useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Dispatch } from 'redux';
import { ActionCreator } from 'typescript-fsa';

import { AllTimelinesQuery } from '../../containers/timeline/all';
import { SortFieldTimeline, Direction } from '../../graphql/types';
import { queryTimelineById, dispatchUpdateTimeline } from '../open_timeline/helpers';
import { OnOpenTimeline } from '../open_timeline/types';
import { LoadingPlaceholders } from '../page/overview/loading_placeholders';
import { updateIsLoading as dispatchUpdateIsLoading } from '../../store/timeline/actions';

import { RecentTimelines } from './recent_timelines';
import * as i18n from './translations';
import { FilterMode } from './types';

export interface MeApiResponse {
  username: string;
}

interface OwnProps {
  apolloClient: ApolloClient<{}>;
  filterBy: FilterMode;
}

export type Props = OwnProps & PropsFromRedux;

const StatefulRecentTimelinesComponent = React.memo<Props>(
  ({ apolloClient, filterBy, updateIsLoading, updateTimeline }) => {
    const actionDispatcher = updateIsLoading as ActionCreator<{ id: string; isLoading: boolean }>;
    const onOpenTimeline: OnOpenTimeline = useCallback(
      ({ duplicate, timelineId }: { duplicate: boolean; timelineId: string }) => {
        queryTimelineById({
          apolloClient,
          duplicate,
          timelineId,
          updateIsLoading: actionDispatcher,
          updateTimeline,
        });
      },
      [apolloClient, updateIsLoading, updateTimeline]
    );

    const noTimelinesMessage =
      filterBy === 'favorites' ? i18n.NO_FAVORITE_TIMELINES : i18n.NO_TIMELINES;

    return (
      <AllTimelinesQuery
        pageInfo={{
          pageIndex: 1,
          pageSize: 5,
        }}
        search={''}
        sort={{
          sortField: SortFieldTimeline.updated,
          sortOrder: Direction.desc,
        }}
        onlyUserFavorite={filterBy === 'favorites'}
      >
        {({ timelines, loading }) => (
          <>
            {loading ? (
              <LoadingPlaceholders lines={2} placeholders={filterBy === 'favorites' ? 1 : 5} />
            ) : (
              <RecentTimelines
                noTimelinesMessage={noTimelinesMessage}
                onOpenTimeline={onOpenTimeline}
                timelines={timelines}
              />
            )}
            <EuiHorizontalRule margin="s" />
            <EuiText size="xs">
              <EuiLink href="#/link-to/timelines">{i18n.VIEW_ALL_TIMELINES}</EuiLink>
            </EuiText>
          </>
        )}
      </AllTimelinesQuery>
    );
  }
);

StatefulRecentTimelinesComponent.displayName = 'StatefulRecentTimelinesComponent';

const mapDispatchToProps = (dispatch: Dispatch) => ({
  updateIsLoading: ({ id, isLoading }: { id: string; isLoading: boolean }) =>
    dispatch(dispatchUpdateIsLoading({ id, isLoading })),
  updateTimeline: dispatchUpdateTimeline(dispatch),
});

const connector = connect(null, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulRecentTimelines = connector(StatefulRecentTimelinesComponent);
