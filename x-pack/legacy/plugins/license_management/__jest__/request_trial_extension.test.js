/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestTrialExtension } from '../public/np_ready/application/sections/license_dashboard/request_trial_extension';
import { createMockLicense, getComponent } from './util';
jest.mock(`@elastic/eui/lib/components/form/form_row/make_id`, () => () => `generated-id`);

describe('RequestTrialExtension component', () => {
  test('should not display when license is active and trial has not been used', () => {
    const rendered = getComponent(
      {
        trialStatus: {
          canStartTrial: true,
        },
        license: createMockLicense('trial'),
      },
      RequestTrialExtension
    );
    expect(rendered.isEmptyRender()).toBeTruthy();
  });
  test('should display when license is active and trial has been used', () => {
    const rendered = getComponent(
      {
        trialStatus: {
          canStartTrial: false,
        },
        license: createMockLicense('trial'),
      },
      RequestTrialExtension
    );
    const html = rendered.html();
    expect(html).not.toBeNull();
    expect(html).toMatchSnapshot();
  });
  test('should not display when license is not active and trial has not been used', () => {
    const rendered = getComponent(
      {
        trialStatus: {
          canStartTrial: true,
        },
        license: createMockLicense('trial', 0),
      },
      RequestTrialExtension
    );
    expect(rendered.isEmptyRender()).toBeTruthy();
  });
  test('should display when license is not active and trial has been used', () => {
    const rendered = getComponent(
      {
        trialStatus: {
          canStartTrial: false,
        },
        license: createMockLicense('trial', 0),
      },
      RequestTrialExtension
    );
    const html = rendered.html();
    expect(html).not.toBeNull();
    expect(html).toMatchSnapshot();
  });
  test('should display when platinum license is not active and trial has been used', () => {
    const rendered = getComponent(
      {
        trialStatus: {
          canStartTrial: false,
        },
        license: createMockLicense('platinum', 0),
      },
      RequestTrialExtension
    );
    const html = rendered.html();
    expect(html).not.toBeNull();
    expect(html).toMatchSnapshot();
  });
  test('should display when enterprise license is not active and trial has been used', () => {
    const rendered = getComponent(
      {
        trialStatus: {
          canStartTrial: false,
        },
        license: createMockLicense('enterprise', 0),
      },
      RequestTrialExtension
    );
    const html = rendered.html();
    expect(html).not.toBeNull();
    expect(html).toMatchSnapshot();
  });
  test('should not display when platinum license is active and trial has been used', () => {
    const rendered = getComponent(
      {
        trialStatus: {
          canStartTrial: false,
        },
        license: createMockLicense('platinum'),
      },
      RequestTrialExtension
    );
    expect(rendered.isEmptyRender()).toBeTruthy();
  });
});
