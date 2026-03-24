/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { renderWithI18n } from '@kbn/test-jest-helpers';

import { SolutionViewSwitchModal } from './solution_view_switch_modal';

describe('SolutionViewSwitchModal', () => {
  test('calls onSwitch with currentSolution by default', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onSwitch = jest.fn();

    renderWithI18n(
      <SolutionViewSwitchModal
        onClose={onClose}
        onSwitch={onSwitch}
        currentSolution="es"
        isLoading={false}
        manageSpacesUrl="app/management/kibana/spaces"
      />
    );

    await user.click(screen.getByRole('button', { name: 'Switch now' }));

    expect(onSwitch).toHaveBeenCalledWith('es');
  });
});
