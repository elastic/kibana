/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { I18nProvider } from '@kbn/i18n-react';

import type { CopyModeControlProps } from './copy_mode_control';
import { CopyModeControl } from './copy_mode_control';

const renderWithIntl = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('CopyModeControl', () => {
  const initialValues = { createNewCopies: true, overwrite: true };
  const updateSelection = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const props: CopyModeControlProps = { initialValues, updateSelection };

  it('should allow the user to toggle overwrite', async () => {
    renderWithIntl(<CopyModeControl {...props} />);

    expect(updateSelection).not.toHaveBeenCalled();

    await userEvent.click(screen.getByLabelText(/check for existing objects/i));
    const createNewCopies = false;

    await userEvent.click(screen.getByLabelText(/request action on conflict/i));
    expect(updateSelection).toHaveBeenNthCalledWith(2, { createNewCopies, overwrite: false });

    await userEvent.click(screen.getByLabelText(/automatically overwrite conflicts/i));
    expect(updateSelection).toHaveBeenNthCalledWith(3, { createNewCopies, overwrite: true });
  });

  it('should enable the Overwrite switch when createNewCopies is disabled', async () => {
    renderWithIntl(<CopyModeControl {...props} />);

    expect(screen.getByLabelText(/automatically overwrite conflicts/i)).toBeDisabled();
    await userEvent.click(screen.getByLabelText(/check for existing objects/i));
    expect(screen.getByLabelText(/automatically overwrite conflicts/i)).not.toBeDisabled();
  });

  it('should allow the user to toggle createNewCopies', async () => {
    renderWithIntl(<CopyModeControl {...props} />);

    expect(updateSelection).not.toHaveBeenCalled();
    const { overwrite } = initialValues;

    await userEvent.click(screen.getByLabelText(/check for existing objects/i));
    expect(updateSelection).toHaveBeenNthCalledWith(1, { createNewCopies: false, overwrite });

    await userEvent.click(screen.getByLabelText(/create new objects with random ids/i));
    expect(updateSelection).toHaveBeenNthCalledWith(2, { createNewCopies: true, overwrite });
  });
});
