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
  handleChangeQuestionAnswer: jest.fn(),
  handleChangeAllowEmailContact: jest.fn(),
  handleChangeEmail: jest.fn(),
  email: '',
  questions: feedbackRegistry.get(DEFAULT_REGISTRY_ID) || [],
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
      renderWithI18n(<FeedbackBody {...propsMock} />);
    });

    const body = screen.getByTestId('feedbackBody');

    expect(body).toBeInTheDocument();
  });

  it('should render feedback text inside textarea', async () => {
    const questions = feedbackRegistry.get(DEFAULT_REGISTRY_ID) || [];
    const questionId = questions[0]?.id || 'test-question';

    await act(async () => {
      renderWithI18n(
        <FeedbackBody
          {...propsMock}
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
    const questions = feedbackRegistry.get(DEFAULT_REGISTRY_ID) || [];
    const questionId = questions[0]?.id || 'test-question';

    await act(async () => {
      renderWithI18n(<FeedbackBody {...propsMock} questions={questions} />);
    });

    const feedbackTextarea = screen.getByTestId(`feedback-${questionId}-text-area`);

    expect(feedbackTextarea).toBeInTheDocument();

    fireEvent.change(feedbackTextarea, {
      target: { value: 'Test feedback' },
    });

    expect(propsMock.handleChangeQuestionAnswer).toHaveBeenCalledWith(questionId, 'Test feedback');
    expect(propsMock.handleChangeQuestionAnswer).toHaveBeenCalledTimes(1);
  });
});
