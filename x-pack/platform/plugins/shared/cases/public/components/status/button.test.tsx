/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CaseStatuses } from '../../../common/types/domain';
import { StatusActionButton } from './button';
import { renderWithTestingProviders } from '../../common/mock';
import * as i18n from '../all_cases/translations';

describe('StatusActionButton', () => {
  const onStatusChanged = jest.fn();
  const defaultProps = {
    status: CaseStatuses.open,
    totalAlerts: 0,
    syncAlertsEnabled: true,
    disabled: false,
    isLoading: false,
    onStatusChanged,
  };
  const renderComponent = (props = defaultProps) =>
    renderWithTestingProviders(<StatusActionButton {...props} />);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('it renders', async () => {
    renderComponent();

    expect(screen.getByTestId('case-view-status-action-button')).toBeInTheDocument();
  });

  describe('Button icons', () => {
    it.each([
      [CaseStatuses.open, 'folderExclamation'],
      [CaseStatuses['in-progress'], 'folderCheck'],
      [CaseStatuses.closed, 'folderOpen'],
    ])('it renders the correct button icon: status %s', (status, iconType) => {
      renderComponent({ ...defaultProps, status });

      // EUI icons expose no accessible role/name, so the icon type is read from the DOM attribute
      expect(screen.getByTestId('case-view-status-action-button')).toContainHTML(
        `data-euiicon-type="${iconType}"`
      );
    });
  });

  describe('Status rotation', () => {
    it('rotates correctly to in-progress when status is open', async () => {
      renderComponent();

      await userEvent.click(screen.getByTestId('case-view-status-action-button'));
      expect(onStatusChanged).toHaveBeenCalledWith('in-progress');
    });

    it('rotates correctly to closed when status is in-progress', async () => {
      renderComponent({
        ...defaultProps,
        status: CaseStatuses['in-progress'],
        totalAlerts: 1,
      });

      await userEvent.click(screen.getByTestId('case-view-status-action-button'));
      await userEvent.click(screen.getByRole('button', { name: i18n.CLOSE_CASE_MODAL_CONFIRM }));
      expect(onStatusChanged).toHaveBeenLastCalledWith('closed', undefined);
    });

    it('rotates correctly to open when status is closed', async () => {
      renderComponent({ ...defaultProps, status: CaseStatuses.closed });

      await userEvent.click(screen.getByTestId('case-view-status-action-button'));
      expect(onStatusChanged).toHaveBeenCalledWith('open');
    });
  });
});
