/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionCreator } from 'typescript-fsa';
import { StaticIndexPattern } from 'ui/index_patterns';

import ApolloClient from 'apollo-client';
import { KueryFilterQuery } from '../../store';
import { UrlInputsModel } from '../../store/inputs/model';
import { RouteSpyState } from '../../utils/route/types';
import { DispatchUpdateTimeline } from '../open_timeline/types';
import { NavTab } from '../navigation/types';

import { CONSTANTS, UrlStateType } from './constants';

export const ALL_URL_STATE_KEYS: KeyUrlState[] = [
  CONSTANTS.kqlQuery,
  CONSTANTS.timerange,
  CONSTANTS.timelineId,
];

export const URL_STATE_KEYS: Record<UrlStateType, KeyUrlState[]> = {
  host: [CONSTANTS.kqlQuery, CONSTANTS.timerange, CONSTANTS.timelineId],
  network: [CONSTANTS.kqlQuery, CONSTANTS.timerange, CONSTANTS.timelineId],
  timeline: [CONSTANTS.timelineId, CONSTANTS.timerange],
  overview: [CONSTANTS.timelineId, CONSTANTS.timerange],
};

export type LocationTypes =
  | CONSTANTS.networkDetails
  | CONSTANTS.networkPage
  | CONSTANTS.hostsDetails
  | CONSTANTS.hostsPage
  | CONSTANTS.overviewPage
  | CONSTANTS.timelinePage
  | CONSTANTS.unknown;

export interface KqlQuery {
  filterQuery: KueryFilterQuery | null;
  queryLocation: LocationTypes | null;
}

export interface UrlState {
  [CONSTANTS.kqlQuery]: KqlQuery;
  [CONSTANTS.timerange]: UrlInputsModel;
  [CONSTANTS.timelineId]: string;
}
export type KeyUrlState = keyof UrlState;

export interface UrlStateProps {
  navTabs: Record<string, NavTab>;
  indexPattern?: StaticIndexPattern;
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
  urlState: UrlState;
}

export interface UrlStateToRedux {
  urlKey: KeyUrlState;
  newUrlStateString: string;
}

export interface SetInitialStateFromUrl<TCache> {
  apolloClient: ApolloClient<TCache> | ApolloClient<{}> | undefined;
  detailName: string | undefined;
  indexPattern: StaticIndexPattern | undefined;
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
