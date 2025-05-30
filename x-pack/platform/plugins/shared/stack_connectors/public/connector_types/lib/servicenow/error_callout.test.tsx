/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorCallout } from './error_callout';

describe('ErrorCallout', () => {
  it('renders the callout', () => {
    render(<ErrorCallout message={'My error message'} />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('My error message')).toBeInTheDocument();
  });
});
