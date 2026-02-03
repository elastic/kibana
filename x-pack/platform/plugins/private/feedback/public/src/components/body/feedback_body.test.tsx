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
import { getFeedbackQuestionsForApp } from '@kbn/feedback-registry';

const coreStartMock = coreMock.createStart();

const mockProps = {
  handleChangeCsatOptionId: jest.fn(),
  handleChangeQuestionAnswer: jest.fn(),
  handleChangeAllowEmailContact: jest.fn(),
  handleChangeEmail: jest.fn(),
  onEmailValidationChange: jest.fn(),
  email: '',
  questions: getFeedbackQuestionsForApp(),
  allowEmailContact: false,
  selectedCsatOptionId: '',
  questionAnswers: {},
  appTitle: 'Test App',
  core: coreStartMock,
};

describe('FeedbackBody', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render', async () => {
    await act(async () => {
      renderWithI18n(<FeedbackBody {...mockProps} />);
    });

    const body = screen.getByTestId('feedbackBody');

    expect(body).toBeInTheDocument();
  });

  it('should render feedback text inside textarea', async () => {
    const questions = getFeedbackQuestionsForApp();
    const questionId = questions[0]?.id || 'test-question';

    await act(async () => {
      renderWithI18n(
        <FeedbackBody
          {...mockProps}
          questions={questions}
          questionAnswers={{ [questionId]: 'Test feedback' }}
        />
      );
    });

    const body = screen.getByTestId('feedbackBody');

    expect(body).toBeInTheDocument();

    const feedbackTextarea = screen.getByTestId(`feedback-${questionId}-text-area`);

    expect(feedbackTextarea).toBeInTheDocument();
    expect(feedbackTextarea).toHaveValue('Test feedback');
  });

  it('should call handleChangeQuestionAnswer when feedback text is changed', async () => {
    const questions = getFeedbackQuestionsForApp();
    const questionId = questions[0]?.id || 'test-question';

    await act(async () => {
      renderWithI18n(<FeedbackBody {...mockProps} questions={questions} />);
    });

    const feedbackTextarea = screen.getByTestId(`feedback-${questionId}-text-area`);

    expect(feedbackTextarea).toBeInTheDocument();

    fireEvent.change(feedbackTextarea, {
      target: { value: 'Test feedback' },
    });

    expect(mockProps.handleChangeQuestionAnswer).toHaveBeenCalledWith(questionId, 'Test feedback');
    expect(mockProps.handleChangeQuestionAnswer).toHaveBeenCalledTimes(1);
  });

  it('should render CSAT buttons', async () => {
    await act(async () => {
      renderWithI18n(<FeedbackBody {...mockProps} />);
    });

    expect(screen.getByTestId('feedbackCsatButtonGroup')).toBeInTheDocument();
  });

  it('should render email consent checkbox', async () => {
    await act(async () => {
      renderWithI18n(<FeedbackBody {...mockProps} />);
    });

    expect(screen.getByTestId('feedbackEmailConsentCheckbox')).toBeInTheDocument();
  });

  it('should call onEmailValidationChange when provided', async () => {
    await act(async () => {
      renderWithI18n(
        <FeedbackBody {...mockProps} allowEmailContact={true} email="capybara@elastic.co" />
      );
    });

    expect(mockProps.onEmailValidationChange).toHaveBeenCalled();
  });
});
