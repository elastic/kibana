/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TagsField } from './tags_field';
import { createFormWrapper, createMockServices } from '../../test_utils';

describe('TagsField', () => {
  it('renders the tags label', () => {
    render(<TagsField />, { wrapper: createFormWrapper() });

    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('renders the optional label', () => {
    render(<TagsField />, { wrapper: createFormWrapper() });

    expect(screen.getByText('optional')).toBeInTheDocument();
  });

  it('renders the combo box', () => {
    render(<TagsField />, { wrapper: createFormWrapper() });

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders correctly in flyout layout', () => {
    render(<TagsField />, {
      wrapper: createFormWrapper({}, createMockServices(), { layout: 'flyout' }),
    });

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
