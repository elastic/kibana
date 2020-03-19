/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { PageHeader } from '../page_header';
import { renderWithRouter } from '../../lib';
import { Provider } from 'react-redux';

describe('PageHeader', () => {
  it('shallow renders with the date picker', () => {
    const component = renderWithRouter(
      <MockReduxProvider>
        <PageHeader headingText={'TestingHeading'} datePicker={true} />
      </MockReduxProvider>
    );
    expect(component).toMatchSnapshot('page_header_with_date_picker');
  });

  it('shallow renders without the date picker', () => {
    const component = renderWithRouter(
      <MockReduxProvider>
        <PageHeader headingText={'TestingHeading'} datePicker={false} />
      </MockReduxProvider>
    );
    expect(component).toMatchSnapshot('page_header_no_date_picker');
  });

  it('shallow renders extra links', () => {
    const component = renderWithRouter(
      <MockReduxProvider>
        <PageHeader headingText={'TestingHeading'} extraLinks={true} datePicker={true} />
      </MockReduxProvider>
    );
    expect(component).toMatchSnapshot('page_header_with_extra_links');
  });
});

const MockReduxProvider = ({ children }: { children: React.ReactElement }) => (
  <Provider
    store={{
      dispatch: jest.fn(),
      getState: jest.fn(),
      subscribe: jest.fn(),
      replaceReducer: jest.fn(),
    }}
  >
    {children}
  </Provider>
);
