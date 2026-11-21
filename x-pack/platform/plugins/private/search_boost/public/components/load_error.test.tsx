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
import { LoadError } from './load_error';

describe('LoadError', () => {
  it('shows the error and tries again', async () => {
    const onRetry = jest.fn();
    render(
      <I18nProvider>
        <LoadError error={{ message: 'Request failed' }} onRetry={onRetry} />
      </I18nProvider>
    );

    expect(screen.getByTestId('searchBoostLoadError')).toHaveTextContent(
      'Unable to load boost settingsRequest failed'
    );
    await userEvent.click(screen.getByTestId('searchBoostRetry'));
    expect(onRetry).toHaveBeenCalled();
  });
});
