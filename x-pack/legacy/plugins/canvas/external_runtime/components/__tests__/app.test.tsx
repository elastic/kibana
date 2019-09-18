/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
import { App } from '../app';
import { snapshots, SnapshotNames } from '../../test';
import { previousPage, currentPage, nextPage } from '../footer/__tests__/page_controls.test';

jest.mock('../../supported_renderers');

const getWrapper: (name?: SnapshotNames) => ReactWrapper = (name = 'hello') => {
  const workpad = snapshots[name];
  const { height, width } = workpad;
  const stage = {
    height,
    width,
    page: 0,
  };

  return mount(<App {...{ stage, workpad }} />);
};

describe('<App />', () => {
  test('App renders properly', () => {
    expect(getWrapper().html()).toMatchSnapshot();
  });

  test('App can be navigated', () => {
    const wrapper = getWrapper('austin');
    nextPage(wrapper).simulate('click');
    expect(currentPage(wrapper).text()).toEqual('Page 2 of 28');
    previousPage(wrapper).simulate('click');
  });
});
