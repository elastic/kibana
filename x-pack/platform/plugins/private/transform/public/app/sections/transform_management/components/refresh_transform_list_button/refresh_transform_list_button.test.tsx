/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { RefreshTransformListButton } from './refresh_transform_list_button';

describe('RefreshTransformListButton', () => {
  test('renders an accessible icon-only button', async () => {
    const onClick = jest.fn();
    renderWithI18n(<RefreshTransformListButton isLoading={false} onClick={onClick} />);

    const button = screen.getByRole('button', { name: 'Refresh transforms' });
    expect(button).not.toHaveTextContent('Refresh transforms');

    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
