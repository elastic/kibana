/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../mock/test_providers/test_providers';
import { SettingsContextMenu } from './settings_context_menu';
import { AI_ASSISTANT_MENU } from './translations';

describe('SettingsContextMenu', () => {
  it('renders an accessible menu button icon', () => {
    render(
      <TestProviders>
        <SettingsContextMenu />
      </TestProviders>
    );

    expect(screen.getByRole('button', { name: AI_ASSISTANT_MENU })).toBeInTheDocument();
  });
});
