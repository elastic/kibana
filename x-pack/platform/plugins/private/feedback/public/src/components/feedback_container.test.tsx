/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { BehaviorSubject } from 'rxjs';
import { FeedbackContainer } from './feedback_container';

const coreStartMock = coreMock.createStart();
const cloudStartMock = cloudMock.createStart();

const mockProps = {
  core: coreStartMock,
  cloud: cloudStartMock,
  organizationId: 'test-org-id',
  hideFeedbackContainer: jest.fn(),
};

describe('FeedbackContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    coreStartMock.executionContext.get.mockReturnValue({
      name: 'test-app',
      url: '/app/test',
    });
    coreStartMock.chrome.navLinks.getAll.mockReturnValue([]);
    coreStartMock.chrome.getActiveSolutionNavId$.mockReturnValue(new BehaviorSubject(null));
  });

  it('should render container', () => {
    renderWithI18n(<FeedbackContainer {...mockProps} />);

    expect(screen.getByTestId('feedbackContainer')).toBeInTheDocument();
  });

  it('should render header, body, and footer', () => {
    renderWithI18n(<FeedbackContainer {...mockProps} />);

    expect(screen.getByTestId('feedbackHeader')).toBeInTheDocument();
    expect(screen.getByTestId('feedbackBody')).toBeInTheDocument();
    expect(screen.getByTestId('feedbackFooter')).toBeInTheDocument();
  });

  it('should disable send button when no data is entered', () => {
    renderWithI18n(<FeedbackContainer {...mockProps} />);

    const sendButton = screen.getByTestId('feedbackFooterSendFeedbackButton');

    expect(sendButton).toBeDisabled();
  });

  it('should enable send button when CSAT score is selected', async () => {
    renderWithI18n(<FeedbackContainer {...mockProps} />);

    const emailConsentCheckbox = screen.getByTestId('feedbackEmailConsentCheckbox');
    await userEvent.click(emailConsentCheckbox);

    const csatButtons = screen.getAllByRole('button', { name: /^\d$/ });
    await userEvent.click(csatButtons[2]);

    await waitFor(() => {
      const sendButton = screen.getByTestId('feedbackFooterSendFeedbackButton');
      expect(sendButton).not.toBeDisabled();
    });
  });

  it('should submit feedback with correct data', async () => {
    coreStartMock.http.post.mockResolvedValue({});

    renderWithI18n(<FeedbackContainer {...mockProps} />);

    const emailConsentCheckbox = screen.getByTestId('feedbackEmailConsentCheckbox');
    await userEvent.click(emailConsentCheckbox);

    const csatButtons = screen.getAllByRole('button', { name: /^\d$/ });
    await userEvent.click(csatButtons[3]);

    await waitFor(() => {
      const sendButton = screen.getByTestId('feedbackFooterSendFeedbackButton');
      expect(sendButton).not.toBeDisabled();
    });

    const sendButton = screen.getByTestId('feedbackFooterSendFeedbackButton');
    await userEvent.click(sendButton);

    await waitFor(() => {
      expect(coreStartMock.http.post).toHaveBeenCalledWith('/internal/feedback/send', {
        body: expect.any(String),
      });
    });
  });

  it('should show success toast and hide container on successful submit', async () => {
    coreStartMock.http.post.mockResolvedValue({});

    renderWithI18n(<FeedbackContainer {...mockProps} />);

    const emailConsentCheckbox = screen.getByTestId('feedbackEmailConsentCheckbox');
    await userEvent.click(emailConsentCheckbox);

    const csatButtons = screen.getAllByRole('button', { name: /^\d$/ });
    await userEvent.click(csatButtons[3]);

    await waitFor(() => {
      const sendButton = screen.getByTestId('feedbackFooterSendFeedbackButton');
      expect(sendButton).not.toBeDisabled();
    });

    const sendButton = screen.getByTestId('feedbackFooterSendFeedbackButton');
    await userEvent.click(sendButton);

    await waitFor(() => {
      expect(coreStartMock.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: expect.stringContaining('Thanks for your feedback'),
      });
      expect(mockProps.hideFeedbackContainer).toHaveBeenCalledTimes(1);
    });
  });

  it('should disable send button when email is invalid and email consent is checked', async () => {
    renderWithI18n(<FeedbackContainer {...mockProps} />);

    const emailConsentCheckbox = screen.getByTestId('feedbackEmailConsentCheckbox');
    expect(emailConsentCheckbox).toBeChecked();

    const csatButtons = screen.getAllByRole('button', { name: /^\d$/ });
    await userEvent.click(csatButtons[3]);

    const emailInput = await screen.findByTestId('feedbackEmailInput');
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'invalid-email');

    await waitFor(() => {
      const sendButton = screen.getByTestId('feedbackFooterSendFeedbackButton');
      expect(sendButton).toBeDisabled();
    });
  });

  it('should enable send button when email is valid and email consent is checked', async () => {
    renderWithI18n(<FeedbackContainer {...mockProps} />);

    const emailConsentCheckbox = screen.getByTestId('feedbackEmailConsentCheckbox');
    expect(emailConsentCheckbox).toBeChecked();

    const csatButtons = screen.getAllByRole('button', { name: /^\d$/ });
    await userEvent.click(csatButtons[3]);

    const emailInput = await screen.findByTestId('feedbackEmailInput');
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'capybara@elastic.co');

    await waitFor(() => {
      const sendButton = screen.getByTestId('feedbackFooterSendFeedbackButton');
      expect(sendButton).not.toBeDisabled();
    });
  });

  it('should disable send button when email is empty and email consent is checked', async () => {
    renderWithI18n(<FeedbackContainer {...mockProps} />);

    const emailConsentCheckbox = screen.getByTestId('feedbackEmailConsentCheckbox');
    expect(emailConsentCheckbox).toBeChecked();

    const csatButtons = screen.getAllByRole('button', { name: /^\d$/ });
    await userEvent.click(csatButtons[3]);

    await screen.findByTestId('feedbackEmailInput');

    await waitFor(() => {
      const sendButton = screen.getByTestId('feedbackFooterSendFeedbackButton');
      expect(sendButton).toBeDisabled();
    });
  });

  it('should enable send button when email consent is unchecked', async () => {
    renderWithI18n(<FeedbackContainer {...mockProps} />);

    const emailConsentCheckbox = screen.getByTestId('feedbackEmailConsentCheckbox');
    expect(emailConsentCheckbox).toBeChecked();

    const csatButtons = screen.getAllByRole('button', { name: /^\d$/ });
    await userEvent.click(csatButtons[3]);

    await userEvent.click(emailConsentCheckbox);

    expect(emailConsentCheckbox).not.toBeChecked();

    await waitFor(() => {
      const sendButton = screen.getByTestId('feedbackFooterSendFeedbackButton');
      expect(sendButton).not.toBeDisabled();
    });
  });
});
