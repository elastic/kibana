/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { RuleLibraryActionsCell } from './rule_library_actions_cell';

const renderCell = ({
  canWrite = true,
  isInstalling = false,
  onInstall = jest.fn(),
  onReviewAndCreate = jest.fn(),
}: {
  canWrite?: boolean;
  isInstalling?: boolean;
  onInstall?: () => void;
  onReviewAndCreate?: () => void;
} = {}) =>
  render(
    <I18nProvider>
      <RuleLibraryActionsCell
        canWrite={canWrite}
        isInstalling={isInstalling}
        onInstall={onInstall}
        onReviewAndCreate={onReviewAndCreate}
      />
    </I18nProvider>
  );

describe('RuleLibraryActionsCell', () => {
  it('renders Install and a more-actions menu with Review and Create', async () => {
    const user = userEvent.setup();
    renderCell();

    expect(screen.getByTestId('ruleLibraryInstallAction')).toBeInTheDocument();
    await user.click(screen.getByTestId('ruleLibraryMoreActions'));

    expect(screen.getByTestId('ruleLibraryReviewAndCreateAction')).toHaveTextContent(
      'Review and Create'
    );
  });

  it('calls onReviewAndCreate when Review and Create is clicked', async () => {
    const user = userEvent.setup();
    const onReviewAndCreate = jest.fn();
    renderCell({ onReviewAndCreate });

    await user.click(screen.getByTestId('ruleLibraryMoreActions'));
    fireEvent.click(screen.getByTestId('ruleLibraryReviewAndCreateAction'));

    expect(onReviewAndCreate).toHaveBeenCalledTimes(1);
  });

  it('calls onInstall when Install is clicked', async () => {
    const user = userEvent.setup();
    const onInstall = jest.fn();
    renderCell({ onInstall });

    await user.click(screen.getByTestId('ruleLibraryInstallAction'));

    expect(onInstall).toHaveBeenCalledTimes(1);
  });

  it('disables Install when the user cannot write rules', () => {
    renderCell({ canWrite: false });

    expect(screen.getByTestId('ruleLibraryInstallAction')).toBeDisabled();
  });
});
