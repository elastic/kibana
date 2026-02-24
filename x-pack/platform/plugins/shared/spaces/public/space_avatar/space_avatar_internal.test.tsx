/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { SpaceAvatarInternal } from './space_avatar_internal';

test('renders without crashing', () => {
  render(<SpaceAvatarInternal space={{ name: '', id: '' }} />);
  const avatar = screen.getByTestId('space-avatar-');
  expect(avatar).toBeInTheDocument();
  expect(avatar).toHaveAttribute('role', 'img');
});

test('renders with a space name entirely made of whitespace', () => {
  render(<SpaceAvatarInternal space={{ name: '      ', id: '' }} />);
  const avatar = screen.getByTestId('space-avatar-');
  expect(avatar).toBeInTheDocument();
  expect(avatar).toHaveAttribute('role', 'img');
});

test('removes aria-label when instructed not to announce the space name', () => {
  render(<SpaceAvatarInternal space={{ name: '', id: '' }} announceSpaceName={false} />);
  const avatar = screen.getByTestId('space-avatar-');
  expect(avatar).toHaveAttribute('aria-hidden', 'true');
});
