/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { UserActionContentToolbar } from './content_toolbar';

import { renderWithTestingProviders } from '../../common/mock';

jest.mock('../../common/navigation/hooks');
jest.mock('../../common/lib/kibana');

describe('UserActionContentToolbar ', () => {
  it('renders', async () => {
    renderWithTestingProviders(
      <UserActionContentToolbar id="1">{'My children'}</UserActionContentToolbar>
    );

    screen.getByTestId('copy-link-1');
    screen.getByText('My children');
  });
});
