/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { ActionBarStatusItem } from './action_bar_status_item';

describe('ActionBarStatusItem', () => {
  it('should correctly render ActionBarStatusItem', () => {
    const title = 'Title';
    const status = 'Online';

    render(
      <ActionBarStatusItem title={title}>
        <span>{status}</span>
      </ActionBarStatusItem>
    );

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(status)).toBeInTheDocument();
  });
});
