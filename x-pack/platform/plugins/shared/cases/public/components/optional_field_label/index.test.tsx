/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';

import { OptionalFieldLabel } from '.';

describe('OptionalFieldLabel', () => {
  it('it renders correctly', async () => {
    render(OptionalFieldLabel);
    expect(screen.getByTestId('form-optional-field-label')).toHaveTextContent('Optional');
  });
});
