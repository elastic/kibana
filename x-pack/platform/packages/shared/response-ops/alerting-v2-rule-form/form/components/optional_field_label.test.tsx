/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { OptionalFieldLabel } from './optional_field_label';

describe('OptionalFieldLabel', () => {
  it('renders the optional label with consistent styling', () => {
    render(<OptionalFieldLabel />);

    expect(screen.getByTestId('form-optional-field-label')).toHaveTextContent('optional');
  });
});
