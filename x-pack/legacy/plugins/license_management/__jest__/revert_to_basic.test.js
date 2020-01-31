/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RevertToBasic } from '../public/sections/license_dashboard/revert_to_basic';
import { createMockLicense, getComponent } from './util';
jest.mock(`@elastic/eui/lib/components/form/form_row/make_id`, () => () => `generated-id`);

describe('RevertToBasic component', () => {
  test('should display when trial is active', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('trial'),
      },
      RevertToBasic
    );
    expect(rendered.html()).toMatchSnapshot();
  });
  test('should display when license is expired', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('platinum', 0),
      },
      RevertToBasic
    );
    expect(rendered.html()).toMatchSnapshot();
  });
  test('should display when license is about to expire', () => {
    // ten days from now
    const imminentExpirationTime = new Date().getTime() + 10 * 24 * 60 * 60 * 1000;
    const rendered = getComponent(
      {
        license: createMockLicense('platinum', imminentExpirationTime),
      },
      RevertToBasic
    );
    expect(rendered.html()).toMatchSnapshot();
  });
  test('should not display for active basic license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('basic'),
      },
      RevertToBasic
    );
    expect(rendered.isEmptyRender()).toBeTruthy();
  });
  test('should not display for active gold license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('gold'),
      },
      RevertToBasic
    );
    expect(rendered.isEmptyRender()).toBeTruthy();
  });
  test('should not display for active platinum license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('platinum'),
      },
      RevertToBasic
    );
    expect(rendered.isEmptyRender()).toBeTruthy();
  });
});
