/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { EmbeddedMap } from './embedded_map';
import { SetQuery } from './types';

jest.mock('ui/new_platform', () => ({
  npStart: {
    core: {
      injectedMetadata: {
        getKibanaVersion: () => '8.0.0',
      },
    },
    plugins: {
      uiActions: require('../../../../../../../src/plugins/ui_actions/public/mocks').uiActionsPluginMock.createSetupContract(),
    },
  },
  npSetup: {
    core: {
      uiSettings: {
        get$: () => 'world',
      },
    },
    plugins: {
      uiActions: require('../../../../../../../src/plugins/ui_actions/public/mocks').uiActionsPluginMock.createStartContract(),
    },
  },
}));

describe('EmbeddedMap', () => {
  let applyFilterQueryFromKueryExpression: (expression: string) => void;
  let setQuery: SetQuery;

  beforeEach(() => {
    applyFilterQueryFromKueryExpression = jest.fn(expression => {});
    setQuery = jest.fn();
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <EmbeddedMap
        applyFilterQueryFromKueryExpression={applyFilterQueryFromKueryExpression}
        queryExpression={''}
        startDate={new Date('2019-08-28T05:50:47.877Z').getTime()}
        endDate={new Date('2019-08-28T05:50:57.877Z').getTime()}
        setQuery={setQuery}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
