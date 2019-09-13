/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionCreator } from 'typescript-fsa';
import { StaticIndexPattern } from 'ui/index_patterns';
import { Dispatch } from 'redux';

import { hostsModel, KueryFilterQuery, networkModel, SerializedFilterQuery } from '../../store';
import { UrlInputsModel } from '../../store/inputs/model';
import { InputsModelId } from '../../store/inputs/constants';
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

export interface UrlStateDispatchToPropsType {
  addGlobalLinkTo: ActionCreator<{ linkToId: InputsModelId }>;
  addTimelineLinkTo: ActionCreator<{ linkToId: InputsModelId }>;
  dispatch: Dispatch;
  removeGlobalLinkTo: ActionCreator<void>;
  removeTimelineLinkTo: ActionCreator<void>;
  setHostsKql: ActionCreator<{
    filterQuery: SerializedFilterQuery;
    hostsType: hostsModel.HostsType;
  }>;
  setNetworkKql: ActionCreator<{
    filterQuery: SerializedFilterQuery;
    networkType: networkModel.NetworkType;
  }>;
  setAbsoluteTimerange: ActionCreator<{
    from: number;
    fromStr: undefined;
    id: InputsModelId;
    to: number;
    toStr: undefined;
  }>;
  setRelativeTimerange: ActionCreator<{
    from: number;
    fromStr: string;
    id: InputsModelId;
    to: number;
    toStr: string;
  }>;
  updateTimeline: DispatchUpdateTimeline;
  updateTimelineIsLoading: ActionCreator<{
    id: string;
    isLoading: boolean;
  }>;
}

export type UrlStateContainerPropTypes = RouteSpyState &
  UrlStateStateToPropsType &
  UrlStateDispatchToPropsType &
  UrlStateProps;

export interface PreviousLocationUrlState {
  pathName: string | undefined;
  urlState: UrlState;
}
