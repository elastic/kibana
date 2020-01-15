/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ApolloClient from 'apollo-client';
import { EuiHorizontalRule, EuiLink, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { ActionCreator } from 'typescript-fsa';
import chrome from 'ui/chrome';

import { AllTimelinesQuery } from '../../containers/timeline/all';
import { SortFieldTimeline, Direction } from '../../graphql/types';
import { fetchUsername, getMeApiUrl } from './helpers';
import { queryTimelineById, dispatchUpdateTimeline } from '../open_timeline/helpers';
import { DispatchUpdateTimeline, OnOpenTimeline } from '../open_timeline/types';
import { RecentTimelines } from './recent_timelines';
import { updateIsLoading as dispatchUpdateIsLoading } from '../../store/timeline/actions';
import { FilterMode } from './types';

import * as i18n from './translations';

export interface MeApiResponse {
  username: string;
}

interface OwnProps {
  apolloClient: ApolloClient<{}>;
  filterBy: FilterMode;
}

interface DispatchProps {
  updateIsLoading: ({ id, isLoading }: { id: string; isLoading: boolean }) => void;
  updateTimeline: DispatchUpdateTimeline;
}

export type Props = OwnProps & DispatchProps;

const StatefulRecentTimelinesComponent = React.memo<Props>(
  ({ apolloClient, filterBy, updateIsLoading, updateTimeline }) => {
    const actionDispatcher = updateIsLoading as ActionCreator<{ id: string; isLoading: boolean }>;
    const [username, setUsername] = useState<string | null | undefined>(undefined);
    const LoadingSpinner = useMemo(() => <EuiLoadingSpinner size="m" />, []);
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

    useEffect(() => {
      let canceled = false;

      const fetchData = async () => {
        try {
          const loggedInUser = await fetchUsername(getMeApiUrl(chrome.getBasePath));

          if (!canceled) {
            setUsername(loggedInUser);
          }
        } catch (e) {
          if (!canceled) {
            setUsername(null);
          }
        }
      };

      fetchData();

      return () => {
        canceled = true;
      };
    }, []);

    if (username === undefined) {
      return LoadingSpinner;
    } else if (username == null) {
      return null;
    }

    // TODO: why does `createdBy: <username>` specified as a `search` query does not match results?

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
              <>{LoadingSpinner}</>
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

export const StatefulRecentTimelines = connect(
  null,
  mapDispatchToProps
)(StatefulRecentTimelinesComponent);
