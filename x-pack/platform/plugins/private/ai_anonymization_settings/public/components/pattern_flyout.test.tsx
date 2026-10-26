/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { PatternFlyout } from './pattern_flyout';

// The tester modal's Monaco editor is not rendered unless the modal is opened, and loading it is slow.
jest.mock('@kbn/code-editor', () => ({ CodeEditor: () => null }));

const renderFlyout = (onSave: jest.Mock, isPatternTesterEnabled = true) => {
  const onClose = jest.fn();
  render(
    <I18nProvider>
      <PatternFlyout
        enabledRules={[]}
        isPatternTesterEnabled={isPatternTesterEnabled}
        onSave={onSave}
        onClose={onClose}
      />
    </I18nProvider>
  );
  return { onClose };
};

const fillValidPattern = async () => {
  await userEvent.type(
    screen.getByTestId('aiAnonymizationSettingsPatternFlyoutName'),
    'Employee ID'
  );
  await userEvent.type(
    screen.getByTestId('aiAnonymizationSettingsPatternFlyoutPattern'),
    'EMP-\\d+'
  );
};

const clickSave = () =>
  userEvent.click(screen.getByTestId('aiAnonymizationSettingsPatternFlyoutSave'));

describe('PatternFlyout tester button', () => {
  it('offers the tester when it is enabled', () => {
    renderFlyout(jest.fn(), true);

    expect(
      screen.getByTestId('aiAnonymizationSettingsPatternFlyoutTestButton')
    ).toBeInTheDocument();
  });

  it('hides the tester button when the tester is disabled, since every request would be refused', () => {
    renderFlyout(jest.fn(), false);

    expect(
      screen.queryByTestId('aiAnonymizationSettingsPatternFlyoutTestButton')
    ).not.toBeInTheDocument();
  });
});

describe('PatternFlyout saving', () => {
  // The tester runs the pattern exactly as typed, so a saved rule must match what was tested: here the
  // trailing space is an alternative that matches a space.
  it('saves the pattern without trimming significant whitespace', async () => {
    const onSave = jest.fn().mockResolvedValue(true);
    renderFlyout(onSave);
    await userEvent.type(screen.getByTestId('aiAnonymizationSettingsPatternFlyoutName'), 'Spaces');
    await userEvent.type(screen.getByTestId('aiAnonymizationSettingsPatternFlyoutPattern'), 'ID| ');

    await clickSave();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ pattern: 'ID| ' }));
  });

  it('closes once the pattern is saved', async () => {
    const onSave = jest.fn().mockResolvedValue(true);
    const { onClose } = renderFlyout(onSave);
    await fillValidPattern();

    await clickSave();

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Employee ID', pattern: 'EMP-\\d+' })
    );
  });

  it('stays open and keeps what was entered when the save fails, so the draft is not lost', async () => {
    const onSave = jest.fn().mockResolvedValue(false);
    const { onClose } = renderFlyout(onSave);
    await fillValidPattern();

    await clickSave();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('aiAnonymizationSettingsPatternFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('aiAnonymizationSettingsPatternFlyoutName')).toHaveValue(
      'Employee ID'
    );
    expect(screen.getByTestId('aiAnonymizationSettingsPatternFlyoutPattern')).toHaveValue(
      'EMP-\\d+'
    );
    // The user can retry once the first attempt has settled.
    await waitFor(() =>
      expect(screen.getByTestId('aiAnonymizationSettingsPatternFlyoutSave')).toBeEnabled()
    );
  });
});
