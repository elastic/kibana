/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StartTrial } from '../public/np_ready/application/sections/license_dashboard/start_trial';
import { createMockLicense, getComponent } from './util';
jest.mock(`@elastic/eui/lib/components/form/form_row/make_id`, () => () => `generated-id`);

describe('StartTrial component when trial is allowed', () => {
  test('display for basic license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('basic'),
        trialStatus: { canStartTrial: true },
      },
      StartTrial
    );
    expect(rendered.html()).toMatchSnapshot();
  });
  test('should display for gold license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('gold'),
        trialStatus: { canStartTrial: true },
      },
      StartTrial
    );
    expect(rendered.html()).toMatchSnapshot();
  });

  test('should not display for trial license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('trial'),
        trialStatus: { canStartTrial: true },
      },
      StartTrial
    );
    expect(rendered.isEmptyRender()).toBeTruthy();
  });
  test('should not display for active platinum license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('platinum'),
        trialStatus: { canStartTrial: true },
      },
      StartTrial
    );
    expect(rendered.isEmptyRender()).toBeTruthy();
  });
  test('should display for expired platinum license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('platinum', 0),
        trialStatus: { canStartTrial: true },
      },
      StartTrial
    );
    expect(rendered.html()).toMatchSnapshot();
  });
});

describe('StartTrial component when trial is not available', () => {
  test('should not display for basic license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('basic'),
        trialStatus: { canStartTrial: false },
      },
      StartTrial
    );
    expect(rendered.isEmptyRender()).toBeTruthy();
  });
  test('should not display for gold license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('gold'),
        trialStatus: { canStartTrial: false },
      },
      StartTrial
    );
    expect(rendered.isEmptyRender()).toBeTruthy();
  });
  test('should not display for platinum license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('platinum'),
        trialStatus: { canStartTrial: false },
      },
      StartTrial
    );
    expect(rendered.isEmptyRender()).toBeTruthy();
  });

  test('should not display for trial license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('gold'),
        trialStatus: { canStartTrial: false },
      },
      StartTrial
    );
    expect(rendered.isEmptyRender()).toBeTruthy();
  });
});
