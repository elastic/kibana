/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, within } from '@testing-library/react';
import React from 'react';

import { SpaceCard } from './space_card';

test('it renders without crashing', () => {
  const space = {
    id: '',
    name: 'space name',
    description: 'space description',
    disabledFeatures: [],
  };

  render(<SpaceCard space={space} serverBasePath={'/server-base-path'} />);
  expect(screen.getByTestId('space-card-')).toBeInTheDocument();
});

test('links to the indicated space', () => {
  const space = {
    id: 'some-space',
    name: 'space name',
    description: 'space description',
    disabledFeatures: [],
  };

  render(<SpaceCard space={space} serverBasePath={'/server-base-path'} />);
  const card = screen.getByTestId('space-card-some-space');
  const link = within(card).getByRole('link');
  expect(link).toHaveAttribute('href', '/server-base-path/s/some-space/spaces/enter');
  expect(card).toHaveTextContent('space name');
});

test('links to the default space too', () => {
  const space = {
    id: 'default',
    name: 'default space',
    description: 'space description',
    disabledFeatures: [],
  };

  render(<SpaceCard space={space} serverBasePath={'/server-base-path'} />);
  const card = screen.getByTestId('space-card-default');
  const link = within(card).getByRole('link');
  expect(link).toHaveAttribute('href', '/server-base-path/spaces/enter');
  expect(card).toHaveTextContent('default space');
});
