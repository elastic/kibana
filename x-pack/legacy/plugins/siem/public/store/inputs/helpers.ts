/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';

import { InputsModel, TimeRange, Refetch, InspectQuery } from './model';
import { InputsModelId } from './constants';

export const updateInputTimerange = (
  inputId: InputsModelId,
  timerange: TimeRange,
  state: InputsModel
): InputsModel => {
  const input = get(inputId, state);
  if (input != null) {
    return {
      ...[inputId, ...input.linkTo].reduce<InputsModel>(
        (acc: InputsModel, linkToId: InputsModelId) => ({
          ...acc,
          [linkToId]: {
            ...get(linkToId, state),
            timerange,
          },
        }),
        inputId === 'timeline' ? { ...state, global: { ...state.global, linkTo: [] } } : state
      ),
    };
  }
  return state;
};

export const toggleLockTimeline = (linkToId: InputsModelId, state: InputsModel): InputsModel => {
  const linkToIdAlreadyExist = state.global.linkTo.indexOf(linkToId);
  return {
    ...state,
    global: {
      ...state.global,
      timerange: linkToIdAlreadyExist > -1 ? state.global.timerange : state.timeline.timerange,
      linkTo:
        linkToIdAlreadyExist > -1
          ? [
              ...state.global.linkTo.slice(0, linkToIdAlreadyExist),
              ...state.global.linkTo.slice(linkToIdAlreadyExist + 1),
            ]
          : [...state.global.linkTo, linkToId],
    },
    timeline: {
      ...state.timeline,
      linkTo: linkToIdAlreadyExist > -1 ? [] : ['global'],
    },
  };
};

export interface UpdateQueryParams {
  id: string;
  inputId: InputsModelId;
  inspect: InspectQuery | null;
  loading: boolean;
  refetch: Refetch;
  state: InputsModel;
}

export const upsertQuery = ({
  inputId,
  id,
  inspect,
  loading,
  refetch,
  state,
}: UpdateQueryParams): InputsModel => {
  const queryIndex = state[inputId].query.findIndex(q => q.id === id);
  return {
    ...state,
    [inputId]: {
      ...get(inputId, state),
      query:
        queryIndex > -1
          ? [
              ...state[inputId].query.slice(0, queryIndex),
              {
                id,
                inspect,
                isInspected: state[inputId].query[queryIndex].isInspected,
                loading,
                refetch,
                selectedInspectIndex: state[inputId].query[queryIndex].selectedInspectIndex,
              },
              ...state[inputId].query.slice(queryIndex + 1),
            ]
          : [
              ...state[inputId].query,
              { id, inspect, isInspected: false, loading, refetch, selectedInspectIndex: 0 },
            ],
    },
  };
};

export interface SetIsInspectedParams {
  id: string;
  inputId: InputsModelId;
  isInspected: boolean;
  selectedInspectIndex: number;
  state: InputsModel;
}

export const setIsInspected = ({
  id,
  inputId,
  isInspected,
  selectedInspectIndex,
  state,
}: SetIsInspectedParams): InputsModel => {
  const myQueryIndex = state[inputId].query.findIndex(q => q.id === id);
  const myQuery = myQueryIndex > -1 ? state[inputId].query[myQueryIndex] : null;

  return {
    ...state,
    [inputId]: {
      ...get(inputId, state),
      query:
        myQueryIndex > -1
          ? [
              ...state[inputId].query.slice(0, myQueryIndex),
              { ...myQuery, isInspected, selectedInspectIndex },
              ...state[inputId].query.slice(myQueryIndex + 1),
            ]
          : [...state[inputId].query],
    },
  };
};

export const removeGlobalLink = (state: InputsModel): InputsModel => ({
  ...state,
  global: {
    ...state.global,
    linkTo: [],
  },
});

export const addGlobalLink = (linkToId: InputsModelId, state: InputsModel): InputsModel => ({
  ...state,
  global: {
    ...state.global,
    linkTo: [linkToId],
  },
});

export const removeTimelineLink = (state: InputsModel): InputsModel => ({
  ...state,
  timeline: {
    ...state.timeline,
    linkTo: [],
  },
});

export const addTimelineLink = (linkToId: InputsModelId, state: InputsModel): InputsModel => ({
  ...state,
  timeline: {
    ...state.timeline,
    linkTo: [linkToId],
  },
});
