/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
import { TestingContext } from '../../../test';
import { PageControls } from '../page_controls.container';

export const previousPage = (wrapper: ReactWrapper) =>
  wrapper.find('EuiButtonIcon[data-test-subj="pageControlsPrevPage"]');
export const nextPage = (wrapper: ReactWrapper) =>
  wrapper.find('EuiButtonIcon[data-test-subj="pageControlsNextPage"]');
export const currentPage = (wrapper: ReactWrapper) =>
  wrapper.find('EuiButtonEmpty[data-test-subj="pageControlsCurrentPage"]');

describe('<PageControls />', () => {
  test('null workpad renders nothing', () => {
    expect(mount(<PageControls />).isEmptyRender());
  });

  const hello = mount(
    <TestingContext source="hello">
      <PageControls />
    </TestingContext>
  );
  const austin = mount(
    <TestingContext source="austin">
      <PageControls />
    </TestingContext>
  );

  test('hello: renders as expected', () => {
    expect(previousPage(hello).props().disabled).toEqual(true);
    expect(nextPage(hello).props().disabled).toEqual(true);
    expect(currentPage(hello).text()).toEqual('Page 1');
  });

  test('austin: renders as expected', () => {
    expect(previousPage(austin).props().disabled).toEqual(true);
    expect(nextPage(austin).props().disabled).toEqual(false);
    expect(currentPage(austin).text()).toEqual('Page 1 of 28');
  });

  test('austin: moves between pages', () => {
    nextPage(austin).simulate('click');
    expect(currentPage(austin).text()).toEqual('Page 2 of 28');
    nextPage(austin).simulate('click');
    expect(currentPage(austin).text()).toEqual('Page 3 of 28');
    previousPage(austin).simulate('click');
    expect(currentPage(austin).text()).toEqual('Page 2 of 28');
  });
});
