/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';

import { apolloClientObservable, mockGlobalState } from '../../../../mock';
import { createStore, State } from '../../../../store';

import { EventsOverTimeHistogram } from '.';

jest.mock('../../../header_panel', () => {
  return {
    HeaderPanel: () => <div className="headerPanel"></div>,
  };
});

jest.mock('../../../charts/barchart', () => {
  return {
    BarChart: () => <div className="barchart"></div>,
  };
});

describe('Load More Events Table Component', () => {
  const state: State = mockGlobalState;

  let store = createStore(state, apolloClientObservable);

  beforeEach(() => {
    store = createStore(state, apolloClientObservable);
  });

  describe('rendering', () => {
    test('it renders loading pannel', () => {
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <EventsOverTimeHistogram
            id="eventsOverTimeQuery"
            loading={true}
            data={{ inspect: null, eventsOverTime: [], totalCount: 0 }}
            startDate={1563476400000}
            endDate={1563480000000}
          />
        </ReduxStoreProvider>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders BarChart if data available', () => {
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <EventsOverTimeHistogram
            id="eventsOverTimeQuery"
            loading={false}
            data={{
              inspect: null,
              eventsOverTime: [{ x: 1563476400000, y: 62475 }, { x: 1563480000000, y: 252322 }],
              totalCount: 0,
            }}
            startDate={1563476400000}
            endDate={1563480000000}
          />
        </ReduxStoreProvider>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});
