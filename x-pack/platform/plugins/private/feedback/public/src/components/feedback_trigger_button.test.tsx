/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { FeedbackTriggerButton } from './feedback_trigger_button';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { coreMock } from '@kbn/core/public/mocks';
import userEvent from '@testing-library/user-event';

const coreStartMock = coreMock.createStart();

const mockProps = {
  core: coreStartMock,
};

describe('FeedbackButton', () => {
  beforeEach(() => {});

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render feedback trigger button when opted in', async () => {
    coreStartMock.http.get.mockResolvedValue({ optIn: true });
    renderWithI18n(<FeedbackTriggerButton {...mockProps} />);

    await waitFor(() => {
      const feedbackButton = screen.getByTestId('feedbackTriggerButton');
      expect(feedbackButton).toBeInTheDocument();
      expect(feedbackButton).not.toBeDisabled();
    });
  });

  it('should render disabled button when not opted in', async () => {
    coreStartMock.http.get.mockResolvedValue({ optIn: false });

    renderWithI18n(<FeedbackTriggerButton {...mockProps} />);

    await waitFor(() => {
      const feedbackButton = screen.getByTestId('feedbackTriggerButton');
      expect(feedbackButton).toBeInTheDocument();
      expect(feedbackButton).toBeDisabled();
    });
  });

  it('should open feedback container when clicked', async () => {
    coreStartMock.http.get.mockResolvedValue({ optIn: true });
    renderWithI18n(<FeedbackTriggerButton {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('feedbackTriggerButton')).not.toBeDisabled();
    });

    const feedbackButton = screen.getByTestId('feedbackTriggerButton');
    await userEvent.click(feedbackButton);

    expect(coreStartMock.overlays.openModal).toHaveBeenCalled();
  });
});
