/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiLoadingLogo, EuiLoadingSpinner } from '@elastic/eui';

import { Loading, LoadingOverlay } from '.';

describe('Loading', () => {
  it('renders', () => {
    const wrapper = shallow(<Loading />);
    expect(wrapper.hasClass('enterpriseSearchLoading')).toBe(true);
    expect(wrapper.find(EuiLoadingLogo)).toHaveLength(1);
  });
});

describe('LoadingOverlay', () => {
  it('renders', () => {
    const wrapper = shallow(<LoadingOverlay />);
    expect(wrapper.hasClass('enterpriseSearchLoadingOverlay')).toBe(true);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(1);
  });
});
