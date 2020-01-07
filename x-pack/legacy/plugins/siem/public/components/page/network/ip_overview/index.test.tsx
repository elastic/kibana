/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';
import { ActionCreator } from 'typescript-fsa';

import { FlowTarget } from '../../../../graphql/types';
import { apolloClientObservable, mockGlobalState, TestProviders } from '../../../../mock';
import { createStore, networkModel, State } from '../../../../store';

import { IpOverview } from './index';
import { mockData } from './mock';
import { mockAnomalies } from '../../../ml/mock';
import { NarrowDateRange } from '../../../ml/types';

describe('IP Overview Component', () => {
  const state: State = mockGlobalState;

  let store = createStore(state, apolloClientObservable);

  beforeEach(() => {
    store = createStore(state, apolloClientObservable);
  });

  describe('rendering', () => {
    const mockProps = {
      anomaliesData: mockAnomalies,
      data: mockData.IpOverview,
      endDate: new Date('2019-06-18T06:00:00.000Z').valueOf(),
      flowTarget: FlowTarget.source,
      loading: false,
      id: 'ipOverview',
      ip: '10.10.10.10',
      isLoadingAnomaliesData: false,
      narrowDateRange: (jest.fn() as unknown) as NarrowDateRange,
      startDate: new Date('2019-06-15T06:00:00.000Z').valueOf(),
      type: networkModel.NetworkType.details,
      updateFlowTargetAction: (jest.fn() as unknown) as ActionCreator<{
        flowTarget: FlowTarget;
      }>,
    };

    test('it renders the default IP Overview', () => {
      const wrapper = shallow(
        <TestProviders store={store}>
          <IpOverview {...mockProps} />
        </TestProviders>
      );

      expect(toJson(wrapper.find('IpOverview'))).toMatchSnapshot();
    });
  });
});
