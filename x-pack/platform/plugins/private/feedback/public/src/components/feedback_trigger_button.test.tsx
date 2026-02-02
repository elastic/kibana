/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { FeedbackTriggerButton } from './feedback_trigger_button';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { coreMock } from '@kbn/core/public/mocks';
import userEvent from '@testing-library/user-event';

const coreStartMock = coreMock.createStart();

const propsMock = {
  core: coreStartMock,
};

describe('FeedbackButton', () => {
  it('should render feedback trigger button', () => {
    renderWithI18n(<FeedbackTriggerButton {...propsMock} />);

    const feedbackButton = screen.getByTestId('feedbackTriggerButton');
    expect(feedbackButton).toBeInTheDocument();
  });

  it('should open feedback container when clicked', async () => {
    renderWithI18n(<FeedbackTriggerButton {...propsMock} />);

    const feedbackButton = screen.getByTestId('feedbackTriggerButton');

    await userEvent.click(feedbackButton);

    expect(coreStartMock.overlays.openModal).toHaveBeenCalled();
  });
});
