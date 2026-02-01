/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, act, fireEvent } from '@testing-library/react';
import { FeedbackBody } from './feedback_body';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { coreMock } from '@kbn/core/public/mocks';
import { DEFAULT_REGISTRY_ID, feedbackRegistry } from '@kbn/feedback-registry/common';

const coreStartMock = coreMock.createStart();

const propsMock = {
  handleChangeCsatOptionId: jest.fn(),
  handleChangeExperienceFeedbackText: jest.fn(),
  handleChangeGeneralFeedbackText: jest.fn(),
  handleChangeAllowEmailContact: jest.fn(),
  handleChangeEmail: jest.fn(),
  email: '',
  questions: feedbackRegistry.get(DEFAULT_REGISTRY_ID) || [],
  allowEmailContact: false,
  selectedCsatOptionId: '',
  experienceFeedbackText: '',
  generalFeedbackText: '',
  core: coreStartMock,
};

describe('FeedbackBody', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render', async () => {
    await act(async () => {
      renderWithI18n(<FeedbackBody {...propsMock} />);
    });

    const body = screen.getByTestId('feedbackBody');

    expect(body).toBeInTheDocument();
  });

  it('should render feedback text inside textarea', async () => {
    await act(async () => {
      renderWithI18n(<FeedbackBody {...propsMock} experienceFeedbackText="Test feedback" />);
    });

    const body = screen.getByTestId('feedbackBody');

    expect(body).toBeInTheDocument();

    const feedbackTextarea = screen.getByTestId('feedbackExperienceTextArea');

    expect(feedbackTextarea).toBeInTheDocument();
    expect(feedbackTextarea).toHaveValue('Test feedback');
  });

  it('should call handleChangeExperienceFeedbackText when feedback text is changed', async () => {
    await act(async () => {
      renderWithI18n(<FeedbackBody {...propsMock} questions={[]} />);
    });

    const feedbackTextarea = screen.getByTestId('feedbackExperienceTextArea');

    expect(feedbackTextarea).toBeInTheDocument();

    fireEvent.change(feedbackTextarea, {
      target: { value: 'Test feedback' },
    });

    expect(propsMock.handleChangeExperienceFeedbackText).toHaveBeenCalledTimes(1);
  });
});
