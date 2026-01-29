/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ErrorFallback } from './error_fallback';

describe('ErrorFallback', () => {
  it('should render the error message in a code block', () => {
    const error = new Error('An error occurred');
    render(
      <IntlProvider locale="en">
        <ErrorFallback error={error} />
      </IntlProvider>
    );
    expect(screen.getByRole('code')).toHaveTextContent('An error occurred');
  });
});
