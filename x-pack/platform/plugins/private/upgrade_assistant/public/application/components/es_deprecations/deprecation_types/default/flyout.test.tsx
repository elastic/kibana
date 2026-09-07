/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { mockDefaultDeprecation } from '../../__fixtures__/es_deprecations';
import { DefaultDeprecationFlyout } from './flyout';

describe('DefaultDeprecationFlyout', () => {
  it('renders deprecation details', () => {
    renderWithI18n(
      <DefaultDeprecationFlyout deprecation={mockDefaultDeprecation} closeFlyout={jest.fn()} />
    );

    expect(screen.getByTestId('flyoutTitle')).toHaveTextContent(mockDefaultDeprecation.message);
    expect(screen.getByTestId('documentationLink')).toHaveAttribute(
      'href',
      mockDefaultDeprecation.url
    );
    expect(screen.getByTestId('flyoutDescription')).toHaveTextContent(
      String(mockDefaultDeprecation.index)
    );
  });
});
