/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';

import { mockGlobalState } from '../../mock';

import {
  toggleLockTimeline,
  updateInputTimerange,
  upsertQuery,
  UpdateQueryParams,
  SetIsInspectedParams,
  setIsInspected,
} from './helpers';
import { InputsModel, TimeRange } from './model';

describe('Inputs', () => {
  let state = mockGlobalState.inputs;
  describe('#toggleLockTimeline', () => {
    beforeEach(() => {
      state = cloneDeep(mockGlobalState.inputs);
    });
    test('remove timeline Lock from inputs', () => {
      const newState: InputsModel = toggleLockTimeline('timeline', state);
      expect(newState.timeline.linkTo).toEqual([]);
      expect(newState.global.linkTo).toEqual([]);
    });

    test('Add timeline Lock from inputs', () => {
      state.global.linkTo = [];
      const newState: InputsModel = toggleLockTimeline('timeline', state);
      expect(newState.timeline.linkTo).toEqual(['global']);
      expect(newState.global.linkTo).toEqual(['timeline']);
    });
  });

  describe('#updateInputTimerange when timeline and global are lock', () => {
    beforeEach(() => {
      state = cloneDeep(mockGlobalState.inputs);
    });

    test('timeline should stay identical when global change', () => {
      const newTimerange: TimeRange = {
        kind: 'relative',
        fromStr: 'now-48h',
        toStr: 'now',
        from: 23,
        to: 26,
      };
      const newState: InputsModel = updateInputTimerange('global', newTimerange, state);
      expect(newState.timeline.timerange).toEqual(newState.global.timerange);
    });

    test('global should stay identical when timeline change', () => {
      const newTimerange: TimeRange = {
        kind: 'relative',
        fromStr: 'now-68h',
        toStr: 'NOTnow',
        from: 29,
        to: 33,
      };
      const newState: InputsModel = updateInputTimerange('timeline', newTimerange, state);
      expect(newState.timeline.timerange).toEqual(newState.global.timerange);
    });
  });

  describe('#updateInputTimerange when timeline and global are NOT lock', () => {
    beforeEach(() => {
      state = cloneDeep(toggleLockTimeline('timeline', mockGlobalState.inputs));
    });

    test('timeline should stay identical when global change', () => {
      const newTimerange: TimeRange = {
        kind: 'relative',
        fromStr: 'now-48h',
        toStr: 'now',
        from: 23,
        to: 26,
      };
      const newState: InputsModel = updateInputTimerange('global', newTimerange, state);
      expect(newState.timeline.timerange).toEqual(state.timeline.timerange);
      expect(newState.global.timerange).toEqual(newTimerange);
    });

    test('global should stay identical when timeline change', () => {
      const newTimerange: TimeRange = {
        kind: 'relative',
        fromStr: 'now-68h',
        toStr: 'NOTnow',
        from: 29,
        to: 33,
      };
      const newState: InputsModel = updateInputTimerange('timeline', newTimerange, state);
      expect(newState.timeline.timerange).toEqual(newTimerange);
      expect(newState.global.timerange).toEqual(state.timeline.timerange);
    });
  });

  describe('#upsertQuery', () => {
    test('make sure you can add a query', () => {
      const refetch = jest.fn();
      const newQuery: UpdateQueryParams = {
        inputId: 'global',
        id: 'myQuery',
        inspect: null,
        loading: false,
        refetch,
        state,
      };
      const newState: InputsModel = upsertQuery(newQuery);

      expect(newState.global.query[0]).toEqual({
        id: 'myQuery',
        inspect: null,
        isInspected: false,
        loading: false,
        refetch,
        selectedInspectIndex: 0,
      });
    });

    test('make sure you can update a query', () => {
      const refetch = jest.fn();
      const newQuery: UpdateQueryParams = {
        inputId: 'global',
        id: 'myQuery',
        inspect: null,
        loading: false,
        refetch,
        state,
      };
      let newState: InputsModel = upsertQuery(newQuery);

      newQuery.loading = true;
      newQuery.state = newState;
      newState = upsertQuery(newQuery);

      expect(newState.global.query[0]).toEqual({
        id: 'myQuery',
        inspect: null,
        isInspected: false,
        loading: true,
        refetch,
        selectedInspectIndex: 0,
      });
    });
  });

  describe('#setIsInspected', () => {
    const refetch = jest.fn();
    beforeEach(() => {
      state = cloneDeep(mockGlobalState.inputs);
      const newQuery: UpdateQueryParams = {
        inputId: 'global',
        id: 'myQuery',
        inspect: null,
        loading: false,
        refetch,
        state,
      };
      state = upsertQuery(newQuery);
    });
    test('make sure you can set isInspected with a positive value', () => {
      const newQuery: SetIsInspectedParams = {
        inputId: 'global',
        id: 'myQuery',
        isInspected: true,
        selectedInspectIndex: 0,
        state,
      };
      const newState: InputsModel = setIsInspected(newQuery);

      expect(newState.global.query[0]).toEqual({
        id: 'myQuery',
        inspect: null,
        isInspected: true,
        loading: false,
        refetch,
        selectedInspectIndex: 0,
      });
    });

    test('make sure you can set isInspected with a negative value', () => {
      const newQuery: SetIsInspectedParams = {
        inputId: 'global',
        id: 'myQuery',
        isInspected: false,
        selectedInspectIndex: 0,
        state,
      };
      const newState: InputsModel = setIsInspected(newQuery);

      expect(newState.global.query[0]).toEqual({
        id: 'myQuery',
        inspect: null,
        isInspected: false,
        loading: false,
        refetch,
        selectedInspectIndex: 0,
      });
    });
  });
});
