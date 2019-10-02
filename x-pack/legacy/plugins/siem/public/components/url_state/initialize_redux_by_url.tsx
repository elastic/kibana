/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isEmpty } from 'lodash/fp';
import { Dispatch } from 'redux';

import { inputsActions } from '../../store/actions';
import { InputsModelId, TimeRangeKinds } from '../../store/inputs/constants';
import {
  UrlInputsModel,
  LinkTo,
  AbsoluteTimeRange,
  RelativeTimeRange,
} from '../../store/inputs/model';
import { savedQueryService, siemFilterManager } from '../search_bar';

import { CONSTANTS } from './constants';
import { decodeRisonUrlState } from './helpers';
import { normalizeTimeRange } from './normalize_time_range';
import {
  DispatchSetInitialStateFromUrl,
  SetInitialStateFromUrl,
  UrlSateQuery,
  KqlQuery,
  SavedQuery,
} from './types';
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
      const kqlQueryStateData: UrlSateQuery = decodeRisonUrlState(newUrlStateString);
      if ((kqlQueryStateData as SavedQuery).savedQueryId != null) {
        savedQueryService
          .getSavedQuery((kqlQueryStateData as SavedQuery).savedQueryId)
          .then(savedQueryData => {
            siemFilterManager.setFilters(savedQueryData.attributes.filters || []);
            dispatch(
              inputsActions.setFilterQuery({
                id: 'global',
                ...savedQueryData.attributes.query,
              })
            );
            dispatch(inputsActions.setSavedQuery({ id: 'global', savedQuery: savedQueryData }));
          });
      } else if ((kqlQueryStateData as KqlQuery).appQuery != null) {
        const kqlQuery = kqlQueryStateData as KqlQuery;
        siemFilterManager.setFilters(kqlQuery.filters || []);
        dispatch(
          inputsActions.setFilterQuery({
            id: 'global',
            query: kqlQuery.appQuery.query,
            language: kqlQuery.appQuery.language,
          })
        );
      }
    }

    if (urlKey === CONSTANTS.timeline) {
      const timeline = decodeRisonUrlState(newUrlStateString);
      if (timeline != null && timeline.id !== '') {
        queryTimelineById({
          apolloClient,
          duplicate: false,
          timelineId: timeline.id,
          openTimeline: timeline.isOpen,
          updateIsLoading: updateTimelineIsLoading,
          updateTimeline,
        });
      }
    }
  });
};
