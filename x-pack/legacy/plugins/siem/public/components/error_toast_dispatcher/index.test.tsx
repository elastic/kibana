/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../mock';
import { ErrorToastDispatcher } from '.';

describe('Error Toast Dispatcher', () => {
  test('it renders', () => {
    const wrapper = mount(<ErrorToastDispatcher toastLifeTimeMs={9999999999} />, {
      wrappingComponent: TestProviders,
    });

    expect(wrapper.find('Connect(ErrorToastDispatcherComponent)')).toHaveLength(1);
  });
});
