/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StartTrial } from '../public/application/sections/license_dashboard/start_trial';
import { createMockLicense, getComponent } from './util';
import { waitFor } from '@testing-library/react';

describe('StartTrial component when trial is allowed', () => {
  test('display for basic license', async () => {
    const rendered = getComponent(
      {
        license: createMockLicense('basic'),
        trialStatus: { canStartTrial: true },
      },
      StartTrial
    );

    await waitFor(() => expect(rendered.services.http.get).toHaveBeenCalled());
    await rendered.services.http.get.mock.results[0].value;

    expect(rendered.renderResult.asFragment()).toMatchSnapshot();
  });
  test('should display for gold license', async () => {
    const rendered = getComponent(
      {
        license: createMockLicense('gold'),
        trialStatus: { canStartTrial: true },
      },
      StartTrial
    );

    await waitFor(() => expect(rendered.services.http.get).toHaveBeenCalled());
    await rendered.services.http.get.mock.results[0].value;

    expect(rendered.renderResult.asFragment()).toMatchSnapshot();
  });

  test('should not display for trial license', async () => {
    const rendered = getComponent(
      {
        license: createMockLicense('trial'),
        trialStatus: { canStartTrial: true },
      },
      StartTrial
    );

    await waitFor(() => expect(rendered.services.http.get).toHaveBeenCalled());
    await rendered.services.http.get.mock.results[0].value;

    expect(rendered.renderResult.container).toBeEmptyDOMElement();
  });
  test('should not display for active platinum license', async () => {
    const rendered = getComponent(
      {
        license: createMockLicense('platinum'),
        trialStatus: { canStartTrial: true },
      },
      StartTrial
    );

    await waitFor(() => expect(rendered.services.http.get).toHaveBeenCalled());
    await rendered.services.http.get.mock.results[0].value;

    expect(rendered.renderResult.container).toBeEmptyDOMElement();
  });
  test('should display for expired platinum license', async () => {
    const rendered = getComponent(
      {
        license: createMockLicense('platinum', 0),
        trialStatus: { canStartTrial: true },
      },
      StartTrial
    );

    await waitFor(() => expect(rendered.services.http.get).toHaveBeenCalled());
    await rendered.services.http.get.mock.results[0].value;

    expect(rendered.renderResult.asFragment()).toMatchSnapshot();
  });
  test('should not display for active enterprise license', async () => {
    const rendered = getComponent(
      {
        license: createMockLicense('enterprise'),
        trialStatus: { canStartTrial: true },
      },
      StartTrial
    );

    await waitFor(() => expect(rendered.services.http.get).toHaveBeenCalled());
    await rendered.services.http.get.mock.results[0].value;

    expect(rendered.renderResult.container).toBeEmptyDOMElement();
  });
  test('should display for expired enterprise license', async () => {
    const rendered = getComponent(
      {
        license: createMockLicense('enterprise', 0),
        trialStatus: { canStartTrial: true },
      },
      StartTrial
    );

    await waitFor(() => expect(rendered.services.http.get).toHaveBeenCalled());
    await rendered.services.http.get.mock.results[0].value;

    expect(rendered.renderResult.asFragment()).toMatchSnapshot();
  });
});

describe('StartTrial component when trial is not available', () => {
  test('should not display for basic license', async () => {
    const rendered = getComponent(
      {
        license: createMockLicense('basic'),
        trialStatus: { canStartTrial: false },
      },
      StartTrial
    );

    await waitFor(() => expect(rendered.services.http.get).toHaveBeenCalled());
    await rendered.services.http.get.mock.results[0].value;

    expect(rendered.renderResult.container).toBeEmptyDOMElement();
  });
  test('should not display for gold license', async () => {
    const rendered = getComponent(
      {
        license: createMockLicense('gold'),
        trialStatus: { canStartTrial: false },
      },
      StartTrial
    );

    await waitFor(() => expect(rendered.services.http.get).toHaveBeenCalled());
    await rendered.services.http.get.mock.results[0].value;

    expect(rendered.renderResult.container).toBeEmptyDOMElement();
  });
  test('should not display for platinum license', async () => {
    const rendered = getComponent(
      {
        license: createMockLicense('platinum'),
        trialStatus: { canStartTrial: false },
      },
      StartTrial
    );

    await waitFor(() => expect(rendered.services.http.get).toHaveBeenCalled());
    await rendered.services.http.get.mock.results[0].value;

    expect(rendered.renderResult.container).toBeEmptyDOMElement();
  });
  test('should not display for enterprise license', async () => {
    const rendered = getComponent(
      {
        license: createMockLicense('enterprise'),
        trialStatus: { canStartTrial: false },
      },
      StartTrial
    );

    await waitFor(() => expect(rendered.services.http.get).toHaveBeenCalled());
    await rendered.services.http.get.mock.results[0].value;

    expect(rendered.renderResult.container).toBeEmptyDOMElement();
  });

  test('should not display for trial license', async () => {
    const rendered = getComponent(
      {
        license: createMockLicense('gold'),
        trialStatus: { canStartTrial: false },
      },
      StartTrial
    );

    await waitFor(() => expect(rendered.services.http.get).toHaveBeenCalled());
    await rendered.services.http.get.mock.results[0].value;

    expect(rendered.renderResult.container).toBeEmptyDOMElement();
  });
});
