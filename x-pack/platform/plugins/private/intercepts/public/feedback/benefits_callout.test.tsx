/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { screen, act } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { FeedbackFlyoutBody } from './flyout';
import { FEEDBACK_TYPE } from './constants';

const commonPropsMock = {
  feedbackText: '',
  userEmail: '',
  handleChangeFeedbackType: jest.fn(),
  handleChangeEmail: jest.fn(),
  handleChangeFeedbackText: jest.fn(),
};

describe('BenefitsCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders callout correctly with proper license type text displayed', async () => {
    const license = licensingMock.createLicense({
      license: {
        type: 'platinum',
      },
    });

    const getLicense = jest.fn().mockResolvedValue(license);

    await act(async () => {
      renderWithI18n(
        <FeedbackFlyoutBody
          feedbackType={FEEDBACK_TYPE.FEATURE_REQUEST}
          getLicense={getLicense}
          {...commonPropsMock}
        />
      );
    });

    const callout = await screen.findByTestId('benefitsCallout');

    expect(callout).toBeInTheDocument();
    expect(callout).toHaveTextContent('Use your Platinum license benefits instead');
  });

  it('does not render callout for trial license type', async () => {
    const license = licensingMock.createLicense({
      license: {
        type: 'trial',
      },
    });

    const getLicense = jest.fn().mockResolvedValue(license);

    await act(async () => {
      renderWithI18n(
        <FeedbackFlyoutBody
          feedbackType={FEEDBACK_TYPE.FEATURE_REQUEST}
          getLicense={getLicense}
          {...commonPropsMock}
        />
      );
    });

    expect(screen.queryByTestId('benefitsCallout')).not.toBeInTheDocument();
  });

  it('does not render callout for undefined license type', async () => {
    const license = licensingMock.createLicense({
      license: {
        type: undefined,
      },
    });

    const getLicense = jest.fn().mockResolvedValue(license);

    await act(async () => {
      renderWithI18n(
        <FeedbackFlyoutBody
          feedbackType={FEEDBACK_TYPE.FEATURE_REQUEST}
          getLicense={getLicense}
          {...commonPropsMock}
        />
      );
    });

    expect(screen.queryByTestId('benefitsCallout')).not.toBeInTheDocument();
  });

  it('does not render callout for other feedback type', async () => {
    const license = licensingMock.createLicense({
      license: {
        type: 'platinum',
      },
    });

    const getLicense = jest.fn().mockResolvedValue(license);

    await act(async () => {
      renderWithI18n(
        <FeedbackFlyoutBody
          feedbackType={FEEDBACK_TYPE.OTHER_FEEDBACK}
          getLicense={getLicense}
          {...commonPropsMock}
        />
      );
    });

    expect(screen.queryByTestId('benefitsCallout')).not.toBeInTheDocument();
  });
});
