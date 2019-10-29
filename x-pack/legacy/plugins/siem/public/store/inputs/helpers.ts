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
  const queryIndex = state[inputId].queries.findIndex(q => q.id === id);
  return {
    ...state,
    [inputId]: {
      ...get(inputId, state),
      queries:
        queryIndex > -1
          ? [
              ...state[inputId].queries.slice(0, queryIndex),
              {
                id,
                inspect,
                isInspected: state[inputId].queries[queryIndex].isInspected,
                loading,
                refetch,
                selectedInspectIndex: state[inputId].queries[queryIndex].selectedInspectIndex,
              },
              ...state[inputId].queries.slice(queryIndex + 1),
            ]
          : [
              ...state[inputId].queries,
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
  const myQueryIndex = state[inputId].queries.findIndex(q => q.id === id);
  const myQuery = myQueryIndex > -1 ? state[inputId].queries[myQueryIndex] : null;

  return {
    ...state,
    [inputId]: {
      ...get(inputId, state),
      queries:
        myQueryIndex > -1
          ? [
              ...state[inputId].queries.slice(0, myQueryIndex),
              { ...myQuery, isInspected, selectedInspectIndex },
              ...state[inputId].queries.slice(myQueryIndex + 1),
            ]
          : [...state[inputId].queries],
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

export interface DeleteOneQueryParams {
  id: string;
  inputId: InputsModelId;
  state: InputsModel;
}

export const deleteOneQuery = ({ inputId, id, state }: DeleteOneQueryParams): InputsModel => {
  const queryIndex = state[inputId].queries.findIndex(q => q.id === id);
  return {
    ...state,
    [inputId]: {
      ...get(inputId, state),
      queries:
        queryIndex > -1
          ? [
              ...state[inputId].queries.slice(0, queryIndex),
              ...state[inputId].queries.slice(queryIndex + 1),
            ]
          : [...state[inputId].queries],
    },
  };
};
