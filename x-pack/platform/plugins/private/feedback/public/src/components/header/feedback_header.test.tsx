/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { FeedbackHeader } from './feedback_header';

describe('FeedbackHeader', () => {
  it('should render the feedback header', () => {
    renderWithI18n(<FeedbackHeader />);

    const header = screen.getByTestId('feedbackHeader');

    expect(header).toBeInTheDocument();
  });
});
