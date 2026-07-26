/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { SpaceCards } from './space_cards';

test('it renders without crashing', () => {
  const space = {
    id: 'space-id',
    name: 'space name',
    description: 'space description',
    disabledFeatures: [],
  };

  render(<SpaceCards spaces={[space]} serverBasePath={'/server-base-path'} />);
  expect(screen.getByTestId('space-card-space-id')).toBeInTheDocument();
});
