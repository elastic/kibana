/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithIntl } from '../../../../../../../test_utils/enzyme_helpers';
import { NoData } from '../';

const enabler = {};

jest.mock('../../../np_imports/ui/chrome', () => {
  return {
    getBasePath: () => '',
  };
});

describe('NoData', () => {
  test('should show text next to the spinner while checking a setting', () => {
    const component = renderWithIntl(
      <NoData isLoading={true} checkMessage="checking something to test" enabler={enabler} />
    );
    expect(component).toMatchSnapshot();
  });

  test('should show a default message if reason is unknown', () => {
    const component = renderWithIntl(
      <NoData
        isLoading={false}
        reason={{
          property: 'xpack.monitoring.foo.bar',
          data: 'taco',
          context: 'food',
        }}
        enabler={enabler}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
