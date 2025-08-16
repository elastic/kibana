/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { AssistantTitle } from './assistant_title';

describe('AssistantTitle', () => {
  it('renders assistant title', async () => {
    render(<AssistantTitle />);

    expect(screen.getByText('Assistant')).toBeInTheDocument();
  });

  it('renders assistant title bolded by default', async () => {
    render(<AssistantTitle />);

    expect(screen.getByTestId('assistant-bolded')).toBeInTheDocument();
  });
});
