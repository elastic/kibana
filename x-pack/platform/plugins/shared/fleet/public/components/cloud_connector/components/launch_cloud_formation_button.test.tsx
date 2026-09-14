/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';

import {
  LaunchCloudFormationButton,
  type LaunchCloudFormationButtonProps,
} from './launch_cloud_formation_button';

const BUTTON_TEST_SUBJ = 'launchCloudFormationTest';
const ERROR_TEST_SUBJ = 'launchCloudFormationTest-error';

describe('LaunchCloudFormationButton', () => {
  const defaultProps: LaunchCloudFormationButtonProps = {
    launchButtonProps: { href: 'https://console.example/quickcreate', target: '_blank' },
    isLoading: false,
    isDisabled: false,
    'data-test-subj': BUTTON_TEST_SUBJ,
    errorCalloutTestSubj: ERROR_TEST_SUBJ,
  };

  const renderButton = (props: Partial<LaunchCloudFormationButtonProps> = {}) =>
    render(
      <I18nProvider>
        <LaunchCloudFormationButton {...defaultProps} {...props} />
      </I18nProvider>
    );

  it('renders as a link when given href props', () => {
    renderButton();

    const button = screen.getByTestId(BUTTON_TEST_SUBJ);
    expect(button).toHaveTextContent('Launch CloudFormation');
    expect(button).toHaveAttribute('href', 'https://console.example/quickcreate');
    expect(button).toHaveAttribute('target', '_blank');
  });

  it('calls onClick when given onClick props', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn().mockResolvedValue(undefined);
    renderButton({ launchButtonProps: { onClick } });

    const button = screen.getByTestId(BUTTON_TEST_SUBJ);
    expect(button).not.toHaveAttribute('href');
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disables the button while loading or when disabled', () => {
    const { rerender } = renderButton({
      isLoading: true,
      launchButtonProps: { onClick: jest.fn() },
    });
    expect(screen.getByTestId(BUTTON_TEST_SUBJ)).toBeDisabled();

    rerender(
      <I18nProvider>
        <LaunchCloudFormationButton
          {...defaultProps}
          launchButtonProps={{ onClick: jest.fn() }}
          isDisabled={true}
        />
      </I18nProvider>
    );
    expect(screen.getByTestId(BUTTON_TEST_SUBJ)).toBeDisabled();
  });

  it('does not render the error callout without a template generation error', () => {
    renderButton();

    expect(screen.queryByTestId(ERROR_TEST_SUBJ)).not.toBeInTheDocument();
  });

  it('renders the error callout with the given test subject and message', () => {
    renderButton({ templateGenerationError: 'Template render failed' });

    const callout = screen.getByTestId(ERROR_TEST_SUBJ);
    expect(callout).toBeInTheDocument();
    expect(callout).toHaveTextContent('Template render failed');
  });
});
