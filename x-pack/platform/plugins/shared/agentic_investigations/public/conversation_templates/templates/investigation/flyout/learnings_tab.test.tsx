/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LearningsTab } from './learnings_tab';

describe('LearningsTab', () => {
  it('says what the tab will show', () => {
    render(<LearningsTab />);

    expect(
      screen.getByText('This will show what Elastic Nightshift learned during the investigation.')
    ).toBeInTheDocument();
  });
});
