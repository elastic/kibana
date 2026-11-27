/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { readCasesPermissions, renderWithTestingProviders } from '../../common/mock';
import type { EditableTitleProps } from './editable_title';
import { EditableTitle } from './editable_title';

describe('EditableTitle', () => {
  const submitTitle = jest.fn();
  const defaultProps: EditableTitleProps = {
    title: 'Test title',
    onSubmit: submitTitle,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const startEditing = async () => {
    await userEvent.click(screen.getByTestId('editable-title-header-value'));
  };

  const typeTitle = async (value: string) => {
    const input = screen.getByTestId('editable-title-input-field');
    await userEvent.clear(input);
    if (value) {
      await userEvent.paste(value);
    }
  };

  it('renders', () => {
    renderWithTestingProviders(<EditableTitle {...defaultProps} />);
    expect(screen.getByText('Test title')).toBeInTheDocument();
  });

  it('inline edit defaults to readOnly when the user does not have the edit permissions', () => {
    renderWithTestingProviders(<EditableTitle {...defaultProps} />, {
      wrapperProps: { permissions: readCasesPermissions() },
    });

    expect(screen.getByTestId('editable-title-header-value')).toBeDisabled();
  });

  it('shows the edit title input field', async () => {
    renderWithTestingProviders(<EditableTitle {...defaultProps} />);

    await startEditing();

    expect(screen.getByTestId('editable-title-input-field')).toBeInTheDocument();
  });

  it('shows the submit button', async () => {
    renderWithTestingProviders(<EditableTitle {...defaultProps} />);

    await startEditing();

    expect(screen.getByTestId('editable-title-submit-btn')).toBeInTheDocument();
  });

  it('shows the cancel button', async () => {
    renderWithTestingProviders(<EditableTitle {...defaultProps} />);

    await startEditing();

    expect(screen.getByTestId('editable-title-cancel-btn')).toBeInTheDocument();
  });

  it('switch to non edit mode when canceled', async () => {
    renderWithTestingProviders(<EditableTitle {...defaultProps} />);

    await startEditing();
    await userEvent.click(screen.getByTestId('editable-title-cancel-btn'));

    expect(screen.getByTestId('editable-title-header-value')).toBeInTheDocument();
  });

  it('should change the title', async () => {
    const newTitle = 'new test title';

    renderWithTestingProviders(<EditableTitle {...defaultProps} />);

    await startEditing();
    await typeTitle(newTitle);

    expect(screen.getByTestId('editable-title-input-field')).toHaveValue(newTitle);
  });

  it('should NOT change the title when cancel', async () => {
    const title = 'Test title';
    const newTitle = 'new test title';

    renderWithTestingProviders(<EditableTitle {...{ ...defaultProps, title }} />);

    await startEditing();
    await typeTitle(newTitle);
    await userEvent.click(screen.getByTestId('editable-title-cancel-btn'));

    expect(screen.getByTestId('editable-title-header-value')).toHaveTextContent(title);
  });

  it('submits the title', async () => {
    const newTitle = 'new test title';

    renderWithTestingProviders(<EditableTitle {...defaultProps} />);

    await startEditing();
    await typeTitle(newTitle);
    await userEvent.click(screen.getByTestId('editable-title-submit-btn'));

    expect(submitTitle).toHaveBeenCalled();
    expect(submitTitle.mock.calls[0][0]).toEqual(newTitle);
    expect(screen.getByTestId('editable-title-header-value')).toBeInTheDocument();
  });

  it('trims the title before submit', async () => {
    const newTitle = 'new test title with spaces          ';

    renderWithTestingProviders(<EditableTitle {...defaultProps} />);

    await startEditing();
    await typeTitle(newTitle);
    await userEvent.click(screen.getByTestId('editable-title-submit-btn'));

    expect(submitTitle).toHaveBeenCalled();
    expect(submitTitle.mock.calls[0][0]).toEqual(newTitle.trim());
    expect(screen.getByTestId('editable-title-header-value')).toBeInTheDocument();
  });

  it('does not submit the title when the length is longer than 160 characters', async () => {
    const longTitle = 'a'.repeat(161);

    renderWithTestingProviders(<EditableTitle {...defaultProps} />);

    await startEditing();
    await typeTitle(longTitle);
    await userEvent.click(screen.getByTestId('editable-title-submit-btn'));

    expect(
      await screen.findByText(
        'The length of the title is too long. The maximum length is 160 characters.'
      )
    ).toBeInTheDocument();
    expect(submitTitle).not.toHaveBeenCalled();
    expect(screen.queryByTestId('editable-title-header-value')).not.toBeInTheDocument();
  });

  it('does not submit the title is empty', async () => {
    renderWithTestingProviders(<EditableTitle {...defaultProps} />);

    await startEditing();
    await typeTitle('');
    await userEvent.click(screen.getByTestId('editable-title-submit-btn'));

    expect(await screen.findByText('A name is required.')).toBeInTheDocument();
    expect(submitTitle).not.toHaveBeenCalled();
    expect(screen.queryByTestId('editable-title-header-value')).not.toBeInTheDocument();
  });

  it('does not show an error after a previous edit error was displayed', async () => {
    const longTitle = 'a'.repeat(161);
    const shortTitle = 'My title';

    renderWithTestingProviders(<EditableTitle {...defaultProps} />);

    await startEditing();

    // simulate a long title
    await typeTitle(longTitle);
    await userEvent.click(screen.getByTestId('editable-title-submit-btn'));
    expect(
      await screen.findByText(
        'The length of the title is too long. The maximum length is 160 characters.'
      )
    ).toBeInTheDocument();

    // write a shorter one
    await typeTitle(shortTitle);

    // submit the form
    await userEvent.click(screen.getByTestId('editable-title-submit-btn'));

    // edit again
    await startEditing();

    // no error should appear
    expect(
      screen.queryByText(
        'The length of the title is too long. The maximum length is 160 characters.'
      )
    ).not.toBeInTheDocument();
  });

  describe('Badges', () => {
    it('does not render the badge if the release is ga', () => {
      renderWithTestingProviders(<EditableTitle {...defaultProps} />);

      expect(screen.getByText('Test title')).toBeInTheDocument();
      expect(screen.queryByText('Beta')).toBeFalsy();
      expect(screen.queryByText('Technical preview')).toBeFalsy();
    });

    it('does render the beta badge', () => {
      renderWithTestingProviders(<EditableTitle {...defaultProps} />, {
        wrapperProps: { releasePhase: 'beta' },
      });

      expect(screen.getByText('Test title')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
    });

    it('does render the experimental badge', () => {
      renderWithTestingProviders(<EditableTitle {...defaultProps} />, {
        wrapperProps: { releasePhase: 'experimental' },
      });

      expect(screen.getByText('Test title')).toBeInTheDocument();
      expect(screen.getByText('Technical preview')).toBeInTheDocument();
    });
  });
});
