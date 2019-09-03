/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { LoadingState } from '../../types';
import AssistanceData from '../__fixtures__/checkup_api_response.json';
import { CheckupTab } from './checkup_tab';

jest.mock('ui/kfetch');

const defaultProps = {
  checkupLabel: 'index',
  deprecations: AssistanceData.indices,
  showBackupWarning: true,
  refreshCheckupData: jest.fn(),
  loadingState: LoadingState.Success,
  setSelectedTabIndex: jest.fn(),
};

/**
 * Mostly a dumb container with copy, test the three main states.
 */
describe('CheckupTab', () => {
  test('render with deprecations', () => {
    expect(shallow(<CheckupTab {...defaultProps} />)).toMatchSnapshot();
  });

  test('render without deprecations', () => {
    expect(
      shallow(
        <CheckupTab
          {...{ ...defaultProps, deprecations: undefined, loadingState: LoadingState.Loading }}
        />
      )
    ).toMatchSnapshot();
  });

  test('render with error', () => {
    expect(
      shallow(
        <CheckupTab
          {...{
            ...defaultProps,
            deprecations: undefined,
            loadingState: LoadingState.Error,
            loadingError: new Error('something bad!'),
          }}
        />
      )
    ).toMatchSnapshot();
  });
});
