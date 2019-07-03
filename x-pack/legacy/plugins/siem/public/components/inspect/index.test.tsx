/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';

import {
  TestProviderWithoutDragAndDrop,
  mockGlobalState,
  apolloClientObservable,
} from '../../mock';
import { createStore, State } from '../../store';
import { UpdateQueryParams, upsertQuery } from '../../store/inputs/helpers';

import { InspectButton } from '.';
import { cloneDeep } from 'lodash/fp';

describe('Inspect Button', () => {
  const refetch = jest.fn();
  const state: State = mockGlobalState;
  const newQuery: UpdateQueryParams = {
    inputId: 'global',
    id: 'myQuery',
    inspect: null,
    loading: false,
    refetch,
    state: state.inputs,
  };

  let store = createStore(state, apolloClientObservable);

  describe('Render', () => {
    beforeEach(() => {
      const myState = cloneDeep(state);
      myState.inputs = upsertQuery(newQuery);
      store = createStore(myState, apolloClientObservable);
    });
    test('Eui Empty Button', () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop store={store}>
          <InspectButton queryId={newQuery.id} inputId="timeline" show={true} title="My title" />
        </TestProviderWithoutDragAndDrop>
      );
      expect(
        wrapper
          .find('button[data-test-subj="inspect-empty-button"]')
          .first()
          .exists()
      ).toBe(true);
    });

    test('Eui Icon Button', () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop store={store}>
          <InspectButton queryId={newQuery.id} show={true} title="My title" />
        </TestProviderWithoutDragAndDrop>
      );
      expect(
        wrapper
          .find('button[data-test-subj="inspect-icon-button"]')
          .first()
          .exists()
      ).toBe(true);
    });

    test('Eui Empty Button disabled', () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop store={store}>
          <InspectButton isDisabled={true} queryId={newQuery.id} show={true} title="My title" />
        </TestProviderWithoutDragAndDrop>
      );
      expect(wrapper.find('.euiButtonIcon').get(0).props.disabled).toBe(true);
    });

    test('Eui Icon Button disabled', () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop store={store}>
          <InspectButton isDisabled={true} queryId={newQuery.id} show={true} title="My title" />
        </TestProviderWithoutDragAndDrop>
      );
      expect(wrapper.find('.euiButtonIcon').get(0).props.disabled).toBe(true);
    });
  });

  describe('Modal Inspect - happy path', () => {
    beforeEach(() => {
      const myState = cloneDeep(state);
      const myQuery = cloneDeep(newQuery);
      myQuery.inspect = {
        dsl: ['my dsl'],
        response: ['my response'],
      };
      myState.inputs = upsertQuery(myQuery);
      store = createStore(myState, apolloClientObservable);
    });
    test('Open Inspect Modal', () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop store={store}>
          <InspectButton queryId={newQuery.id} show={true} title="My title" />
        </TestProviderWithoutDragAndDrop>
      );
      wrapper
        .find('button[data-test-subj="inspect-icon-button"]')
        .first()
        .simulate('click');

      wrapper.update();

      expect(store.getState().inputs.global.query[0].isInspected).toBe(true);
      expect(
        wrapper
          .find('button[data-test-subj="modal-inspect-close"]')
          .first()
          .exists()
      ).toBe(true);
    });

    test('Close Inspect Modal', () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop store={store}>
          <InspectButton queryId={newQuery.id} show={true} title="My title" />
        </TestProviderWithoutDragAndDrop>
      );
      wrapper
        .find('button[data-test-subj="inspect-icon-button"]')
        .first()
        .simulate('click');

      wrapper.update();

      wrapper
        .find('button[data-test-subj="modal-inspect-close"]')
        .first()
        .simulate('click');

      wrapper.update();

      expect(store.getState().inputs.global.query[0].isInspected).toBe(false);
      expect(
        wrapper
          .find('button[data-test-subj="modal-inspect-close"]')
          .first()
          .exists()
      ).toBe(false);
    });

    test('Do not Open Inspect Modal if it is loading', () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop store={store}>
          <InspectButton queryId={newQuery.id} show={true} title="My title" />
        </TestProviderWithoutDragAndDrop>
      );
      store.getState().inputs.global.query[0].loading = true;
      wrapper
        .find('button[data-test-subj="inspect-icon-button"]')
        .first()
        .simulate('click');

      wrapper.update();

      expect(store.getState().inputs.global.query[0].isInspected).toBe(true);
      expect(
        wrapper
          .find('button[data-test-subj="modal-inspect-close"]')
          .first()
          .exists()
      ).toBe(false);
    });
  });
});
