/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isEmpty } from 'lodash/fp';
import { Dispatch } from 'redux';

import { hostsActions, inputsActions, networkActions } from '../../store/actions';
import { InputsModelId, TimeRangeKinds } from '../../store/inputs/constants';
import {
  UrlInputsModel,
  LinkTo,
  AbsoluteTimeRange,
  RelativeTimeRange,
} from '../../store/inputs/model';

import { CONSTANTS } from './constants';
import { decodeRisonUrlState, isKqlForRoute, getCurrentLocation } from './helpers';
import { normalizeTimeRange } from './normalize_time_range';
import { DispatchSetInitialStateFromUrl, KqlQuery, SetInitialStateFromUrl } from './types';
import { convertKueryToElasticSearchQuery } from '../../lib/keury';
import { HostsType } from '../../store/hosts/model';
import { NetworkType } from '../../store/network/model';
import { queryTimelineById } from '../open_timeline/helpers';

export const dispatchSetInitialStateFromUrl = (
  dispatch: Dispatch
): DispatchSetInitialStateFromUrl => ({
  apolloClient,
  detailName,
  indexPattern,
  pageName,
  updateTimeline,
  updateTimelineIsLoading,
  urlStateToUpdate,
}: SetInitialStateFromUrl<unknown>): (() => void) => () => {
  urlStateToUpdate.forEach(({ urlKey, newUrlStateString }) => {
    if (urlKey === CONSTANTS.timerange) {
      const timerangeStateData: UrlInputsModel = decodeRisonUrlState(newUrlStateString);

      const globalId: InputsModelId = 'global';
      const globalLinkTo: LinkTo = { linkTo: get('global.linkTo', timerangeStateData) };
      const globalType: TimeRangeKinds = get('global.timerange.kind', timerangeStateData);

      const timelineId: InputsModelId = 'timeline';
      const timelineLinkTo: LinkTo = { linkTo: get('timeline.linkTo', timerangeStateData) };
      const timelineType: TimeRangeKinds = get('timeline.timerange.kind', timerangeStateData);

      if (isEmpty(globalLinkTo.linkTo)) {
        dispatch(inputsActions.removeGlobalLinkTo());
      } else {
        dispatch(inputsActions.addGlobalLinkTo({ linkToId: 'timeline' }));
      }

      if (isEmpty(timelineLinkTo.linkTo)) {
        dispatch(inputsActions.removeTimelineLinkTo());
      } else {
        dispatch(inputsActions.addTimelineLinkTo({ linkToId: 'global' }));
      }

      if (timelineType) {
        if (timelineType === 'absolute') {
          const absoluteRange = normalizeTimeRange<AbsoluteTimeRange>(
            get('timeline.timerange', timerangeStateData)
          );
          dispatch(
            inputsActions.setAbsoluteRangeDatePicker({
              ...absoluteRange,
              id: timelineId,
            })
          );
        }
        if (timelineType === 'relative') {
          const relativeRange = normalizeTimeRange<RelativeTimeRange>(
            get('timeline.timerange', timerangeStateData)
          );
          dispatch(
            inputsActions.setRelativeRangeDatePicker({
              ...relativeRange,
              id: timelineId,
            })
          );
        }
      }

      if (globalType) {
        if (globalType === 'absolute') {
          const absoluteRange = normalizeTimeRange<AbsoluteTimeRange>(
            get('global.timerange', timerangeStateData)
          );
          dispatch(
            inputsActions.setAbsoluteRangeDatePicker({
              ...absoluteRange,
              id: globalId,
            })
          );
        }
        if (globalType === 'relative') {
          const relativeRange = normalizeTimeRange<RelativeTimeRange>(
            get('global.timerange', timerangeStateData)
          );
          dispatch(
            inputsActions.setRelativeRangeDatePicker({
              ...relativeRange,
              id: globalId,
            })
          );
        }
      }
    }
    if (urlKey === CONSTANTS.kqlQuery && indexPattern != null) {
      const kqlQueryStateData: KqlQuery = decodeRisonUrlState(newUrlStateString);
      if (isKqlForRoute(pageName, detailName, kqlQueryStateData.queryLocation)) {
        const filterQuery = {
          kuery: kqlQueryStateData.filterQuery,
          serializedQuery: convertKueryToElasticSearchQuery(
            kqlQueryStateData.filterQuery ? kqlQueryStateData.filterQuery.expression : '',
            indexPattern
          ),
        };
        const page = getCurrentLocation(pageName, detailName);
        if ([CONSTANTS.hostsPage, CONSTANTS.hostsDetails].includes(page)) {
          dispatch(
            hostsActions.applyHostsFilterQuery({
              filterQuery,
              hostsType: page === CONSTANTS.hostsPage ? HostsType.page : HostsType.details,
            })
          );
        } else if ([CONSTANTS.networkPage, CONSTANTS.networkDetails].includes(page)) {
          dispatch(
            networkActions.applyNetworkFilterQuery({
              filterQuery,
              networkType: page === CONSTANTS.networkPage ? NetworkType.page : NetworkType.details,
            })
          );
        }
      }
    }

    if (urlKey === CONSTANTS.timelineId) {
      const timelineId = decodeRisonUrlState(newUrlStateString);
      if (timelineId != null) {
        queryTimelineById({
          apolloClient,
          duplicate: false,
          timelineId,
          updateIsLoading: updateTimelineIsLoading,
          updateTimeline,
        });
      }
    }
  });
};
