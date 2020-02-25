/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ApolloClient from 'apollo-client';
import * as H from 'history';
import { ActionCreator } from 'typescript-fsa';
import { IIndexPattern, Query, esFilters } from 'src/plugins/data/public';

import { UrlInputsModel } from '../../store/inputs/model';
import { TimelineUrl } from '../../store/timeline/model';
import { RouteSpyState } from '../../utils/route/types';
import { DispatchUpdateTimeline } from '../open_timeline/types';
import { NavTab } from '../navigation/types';

import { CONSTANTS, UrlStateType } from './constants';

export const ALL_URL_STATE_KEYS: KeyUrlState[] = [
  CONSTANTS.appQuery,
  CONSTANTS.filters,
  CONSTANTS.savedQuery,
  CONSTANTS.timerange,
  CONSTANTS.timeline,
];

export const URL_STATE_KEYS: Record<UrlStateType, KeyUrlState[]> = {
  detections: [
    CONSTANTS.appQuery,
    CONSTANTS.filters,
    CONSTANTS.savedQuery,
    CONSTANTS.timerange,
    CONSTANTS.timeline,
  ],
  host: [
    CONSTANTS.appQuery,
    CONSTANTS.filters,
    CONSTANTS.savedQuery,
    CONSTANTS.timerange,
    CONSTANTS.timeline,
  ],
  network: [
    CONSTANTS.appQuery,
    CONSTANTS.filters,
    CONSTANTS.savedQuery,
    CONSTANTS.timerange,
    CONSTANTS.timeline,
  ],
  overview: [
    CONSTANTS.appQuery,
    CONSTANTS.filters,
    CONSTANTS.savedQuery,
    CONSTANTS.timerange,
    CONSTANTS.timeline,
  ],
  timeline: [CONSTANTS.timeline, CONSTANTS.timerange],
};

export type LocationTypes =
  | CONSTANTS.detectionsPage
  | CONSTANTS.hostsDetails
  | CONSTANTS.hostsPage
  | CONSTANTS.networkDetails
  | CONSTANTS.networkPage
  | CONSTANTS.overviewPage
  | CONSTANTS.timelinePage
  | CONSTANTS.unknown;

export interface UrlState {
  [CONSTANTS.appQuery]?: Query;
  [CONSTANTS.filters]?: esFilters.Filter[];
  [CONSTANTS.savedQuery]?: string;
  [CONSTANTS.timerange]: UrlInputsModel;
  [CONSTANTS.timeline]: TimelineUrl;
}
export type KeyUrlState = keyof UrlState;

export interface UrlStateProps {
  navTabs: Record<string, NavTab>;
  indexPattern?: IIndexPattern;
  mapToUrlState?: (value: string) => UrlState;
  onChange?: (urlState: UrlState, previousUrlState: UrlState) => void;
  onInitialize?: (urlState: UrlState) => void;
}

export interface UrlStateStateToPropsType {
  urlState: UrlState;
}

export interface UpdateTimelineIsLoading {
  id: string;
  isLoading: boolean;
}

export interface UrlStateDispatchToPropsType {
  setInitialStateFromUrl: DispatchSetInitialStateFromUrl;
  updateTimeline: DispatchUpdateTimeline;
  updateTimelineIsLoading: ActionCreator<UpdateTimelineIsLoading>;
}

export type UrlStateContainerPropTypes = RouteSpyState &
  UrlStateStateToPropsType &
  UrlStateDispatchToPropsType &
  UrlStateProps;

export interface PreviousLocationUrlState {
  pathName: string | undefined;
  pageName: string | undefined;
  urlState: UrlState;
}

export interface UrlStateToRedux {
  urlKey: KeyUrlState;
  newUrlStateString: string;
}

export interface SetInitialStateFromUrl<TCache> {
  apolloClient: ApolloClient<TCache> | ApolloClient<{}> | undefined;
  detailName: string | undefined;
  indexPattern: IIndexPattern | undefined;
  pageName: string;
  updateTimeline: DispatchUpdateTimeline;
  updateTimelineIsLoading: ActionCreator<UpdateTimelineIsLoading>;
  urlStateToUpdate: UrlStateToRedux[];
}

export type DispatchSetInitialStateFromUrl = <TCache>({
  apolloClient,
  detailName,
  indexPattern,
  pageName,
  updateTimeline,
  updateTimelineIsLoading,
  urlStateToUpdate,
}: SetInitialStateFromUrl<TCache>) => () => void;

export interface ReplaceStateInLocation<T> {
  history?: H.History;
  urlStateToReplace: T;
  urlStateKey: string;
  pathName: string;
  search: string;
}

export interface UpdateUrlStateString {
  isInitializing: boolean;
  history?: H.History;
  newUrlStateString: string;
  pathName: string;
  search: string;
  updateTimerange: boolean;
  urlKey: KeyUrlState;
}
