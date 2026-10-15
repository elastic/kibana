/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ModeSwitchChange } from '../../../common/mode_switch';
import type { BoostMode } from '../../../common/types';
import { ModeSwitchModal } from './mode_switch_modal';

const changes: ModeSwitchChange[] = [
  {
    name: 'catalog-fall',
    type: 'indices',
    from: 'catalog-search',
    to: 'elastic-performant',
    cause: 'custom_rule',
  },
  {
    name: 'catalog-spring',
    type: 'indices',
    from: 'catalog-search',
    to: 'elastic-performant',
    cause: 'custom_rule',
  },
  {
    name: 'logs-app',
    type: 'data_streams',
    from: 'clickstream',
    to: 'elastic-last-7-days',
    cause: 'default_rule',
  },
];

const renderModal = (mode: BoostMode = 'simple') => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  render(
    <IntlProvider locale="en">
      <ModeSwitchModal
        mode={mode}
        changes={changes}
        isSwitching={false}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </IntlProvider>
  );
  return { onConfirm, onCancel };
};

describe('ModeSwitchModal', () => {
  it('explains what turning off advanced mode suspends', () => {
    renderModal('simple');

    expect(screen.getByText('Turn off advanced mode?')).toBeInTheDocument();
    expect(screen.getByTestId('boostModeSwitchModal')).toHaveTextContent(
      'Turning off advanced mode suspends custom boost rules and profiles, and default rules go back to the profiles chosen in simple mode.'
    );
    expect(screen.getByTestId('boostModeSwitchModal')).toHaveTextContent(
      'Nothing is deleted, and turning advanced mode back on restores them.'
    );
    expect(
      screen.getByText('2 indices and 1 data stream change boost profile')
    ).toBeInTheDocument();
  });

  it('explains what turning on advanced mode restores', () => {
    renderModal('advanced');

    expect(screen.getByText('Turn on advanced mode?')).toBeInTheDocument();
    expect(screen.getByTestId('boostModeSwitchModal')).toHaveTextContent(
      'Advanced mode restores your custom boost rules, and the custom profiles chosen for default rules.'
    );
  });

  it('lists each index and data stream with its current and new profile', () => {
    renderModal();

    const table = screen.getByRole('table', {
      name: '2 indices and 1 data stream change boost profile',
    });
    const [, ...rows] = within(table).getAllByRole('row');
    expect(
      rows.map((row) =>
        within(row)
          .getAllByRole('cell')
          .map((cell) => cell.textContent)
      )
    ).toEqual([
      ['catalog-fall', 'catalog-search', 'elastic-performant'],
      ['catalog-spring', 'catalog-search', 'elastic-performant'],
      ['logs-app', 'clickstream', 'elastic-last-7-days'],
    ]);
  });

  it('switches, and remembers whether to skip this next time', async () => {
    const { onConfirm } = renderModal();

    await userEvent.click(screen.getByTestId('boostModeSwitchConfirm'));
    expect(onConfirm).toHaveBeenLastCalledWith(false);

    await userEvent.click(screen.getByLabelText("Don't show this again"));
    await userEvent.click(screen.getByTestId('boostModeSwitchConfirm'));
    expect(onConfirm).toHaveBeenLastCalledWith(true);
  });

  it('cancels without switching', async () => {
    const { onConfirm, onCancel } = renderModal();

    await userEvent.click(screen.getByTestId('boostModeSwitchCancel'));

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
