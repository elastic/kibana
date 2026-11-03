/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CaseStatusDefinition } from '../../../../common/types/domain';
import { DEFAULT_CASE_STATUSES } from '../../../../common/utils/statuses';
import { noCasesSettingsPermission, renderWithTestingProviders } from '../../../common/mock';
import * as customStatuses from '../../../common/custom_statuses';
import * as api from '../../../containers/api';
import { CaseStatusesSettings } from '.';

const triage: CaseStatusDefinition = {
  key: 'triage',
  label: 'Triage',
  color: 'accent',
  category: 'not_started',
  order: 1,
  isDefault: false,
  disabled: false,
};
const retired: CaseStatusDefinition = {
  ...triage,
  key: 'retired',
  label: 'Retired',
  category: 'active',
  order: 2,
  disabled: true,
};
const statuses: CaseStatusDefinition[] = [
  { ...DEFAULT_CASE_STATUSES[0], order: 0 },
  triage,
  retired,
  { ...DEFAULT_CASE_STATUSES[1], order: 3 },
  { ...DEFAULT_CASE_STATUSES[2], order: 4 },
];

const getSavedStatuses = (): CaseStatusDefinition[] => {
  const putSpy = api.putCaseStatuses as jest.MockedFunction<typeof api.putCaseStatuses>;
  return putSpy.mock.calls.at(-1)?.[0].statuses ?? [];
};

const renderSettings = async () => {
  renderWithTestingProviders(<CaseStatusesSettings />);
  await screen.findByTestId('case-status-row-triage');
};

describe('CaseStatusesSettings', () => {
  beforeEach(() => {
    jest.spyOn(customStatuses, 'isCustomStatusesEnabled').mockReturnValue(true);
    jest.spyOn(api, 'getCaseStatuses').mockResolvedValue(statuses);
    jest
      .spyOn(api, 'putCaseStatuses')
      .mockImplementation(async ({ statuses: saved }) => Promise.resolve(saved));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lists the enabled statuses in admin order and hides disabled ones in a collapsed group', async () => {
    await renderSettings();

    const enabledList = screen.getByTestId('case-statuses-enabled-list');
    expect(
      within(enabledList)
        .getAllByTestId(/^case-status-row-/)
        .map((row) => row.getAttribute('data-test-subj'))
    ).toEqual([
      'case-status-row-open',
      'case-status-row-triage',
      'case-status-row-in-progress',
      'case-status-row-closed',
    ]);
    expect(screen.getByTestId('case-statuses-disabled-accordion')).toHaveTextContent(
      'Disabled statuses (1)'
    );
    expect(screen.getByTestId('case-status-open-default-badge')).toBeInTheDocument();
    expect(screen.queryByTestId('case-status-triage-default-badge')).not.toBeInTheDocument();
  });

  it('adds a status with a name, color, and category', async () => {
    await renderSettings();

    await userEvent.click(screen.getByTestId('case-statuses-add'));
    await userEvent.type(screen.getByTestId('case-status-form-name'), 'Awaiting customer');
    await userEvent.click(screen.getByTestId('case-status-form-color-warning'));
    await userEvent.click(screen.getByLabelText('Done'));
    await userEvent.click(screen.getByTestId('case-status-form-save'));

    await waitFor(() => expect(api.putCaseStatuses).toHaveBeenCalled());
    expect(getSavedStatuses().at(-1)).toEqual({
      key: 'awaiting_customer',
      label: 'Awaiting customer',
      color: 'warning',
      category: 'done',
      order: 5,
      isDefault: false,
      disabled: false,
    });
    await waitFor(() =>
      expect(screen.queryByTestId('case-status-form-modal')).not.toBeInTheDocument()
    );
  });

  it('does not save a status whose name is taken', async () => {
    await renderSettings();

    await userEvent.click(screen.getByTestId('case-statuses-add'));
    await userEvent.type(screen.getByTestId('case-status-form-name'), 'triage');
    await userEvent.click(screen.getByTestId('case-status-form-save'));

    expect(screen.getByText('Another status already uses this name.')).toBeInTheDocument();
    expect(api.putCaseStatuses).not.toHaveBeenCalled();
  });

  it('renames and recolors a status, keeping its category', async () => {
    await renderSettings();

    await userEvent.click(screen.getByTestId('case-status-triage-actions'));
    await userEvent.click(await screen.findByTestId('case-status-triage-edit'));

    expect(screen.getByTestId('case-status-form-key')).toHaveValue('triage');
    expect(screen.getByLabelText('Not started')).toBeDisabled();

    const name = screen.getByTestId('case-status-form-name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Sorting');
    await userEvent.click(screen.getByTestId('case-status-form-color-primary'));
    await userEvent.click(screen.getByTestId('case-status-form-save'));

    await waitFor(() => expect(api.putCaseStatuses).toHaveBeenCalled());
    expect(getSavedStatuses()[1]).toEqual({ ...triage, label: 'Sorting', color: 'primary' });
  });

  it('moves a status down past disabled ones', async () => {
    await renderSettings();

    expect(screen.getByTestId('case-status-open-move-up')).toBeDisabled();
    await userEvent.click(screen.getByTestId('case-status-triage-move-down'));

    await waitFor(() => expect(api.putCaseStatuses).toHaveBeenCalled());
    expect(getSavedStatuses().map(({ key, order }) => [key, order])).toEqual([
      ['open', 0],
      ['in-progress', 1],
      ['retired', 2],
      ['triage', 3],
      ['closed', 4],
    ]);
  });

  it('sets the default status of a category', async () => {
    await renderSettings();

    await userEvent.click(screen.getByTestId('case-status-triage-actions'));
    await userEvent.click(await screen.findByTestId('case-status-triage-set-default'));

    await waitFor(() => expect(api.putCaseStatuses).toHaveBeenCalled());
    const saved = getSavedStatuses();
    expect(saved.find(({ key }) => key === 'triage')?.isDefault).toBe(true);
    expect(saved.find(({ key }) => key === 'open')?.isDefault).toBe(false);
  });

  it('disables a status, but not a default one', async () => {
    await renderSettings();

    await userEvent.click(screen.getByTestId('case-status-open-actions'));
    expect(await screen.findByTestId('case-status-open-disable')).toBeDisabled();
    await userEvent.click(screen.getByTestId('case-status-open-actions'));

    await userEvent.click(screen.getByTestId('case-status-triage-actions'));
    await userEvent.click(await screen.findByTestId('case-status-triage-disable'));

    await waitFor(() => expect(api.putCaseStatuses).toHaveBeenCalled());
    expect(getSavedStatuses().find(({ key }) => key === 'triage')?.disabled).toBe(true);
  });

  it('enables a disabled status', async () => {
    await renderSettings();

    await userEvent.click(screen.getByText('Disabled statuses (1)'));
    await userEvent.click(screen.getByTestId('case-status-retired-actions'));
    await userEvent.click(await screen.findByTestId('case-status-retired-enable'));

    await waitFor(() => expect(api.putCaseStatuses).toHaveBeenCalled());
    expect(getSavedStatuses().find(({ key }) => key === 'retired')?.disabled).toBe(false);
  });

  it('shows validation problems instead of saving', async () => {
    // Without a default for done, every change fails validation.
    jest
      .spyOn(api, 'getCaseStatuses')
      .mockResolvedValue(
        statuses.map((status) =>
          status.category === 'done' ? { ...status, isDefault: false } : status
        )
      );
    await renderSettings();

    await userEvent.click(screen.getByTestId('case-status-triage-move-down'));

    expect(await screen.findByTestId('case-statuses-save-errors')).toHaveTextContent(
      'Choose exactly one default status for the done category.'
    );
    expect(api.putCaseStatuses).not.toHaveBeenCalled();
  });

  it('shows the server error when saving fails', async () => {
    jest.spyOn(api, 'putCaseStatuses').mockRejectedValue({
      body: { message: 'Status "triage" is used by a workflow.' },
      message: 'Bad Request',
    });
    await renderSettings();

    await userEvent.click(screen.getByTestId('case-status-triage-move-down'));

    expect(await screen.findByTestId('case-statuses-save-errors')).toHaveTextContent(
      'Status "triage" is used by a workflow.'
    );
  });

  it('renders nothing when custom statuses are off', () => {
    jest.spyOn(customStatuses, 'isCustomStatusesEnabled').mockReturnValue(false);
    renderWithTestingProviders(<CaseStatusesSettings />);

    expect(screen.queryByTestId('case-statuses-section')).not.toBeInTheDocument();
    expect(api.getCaseStatuses).not.toHaveBeenCalled();
  });

  it('renders nothing without the settings privilege', () => {
    renderWithTestingProviders(<CaseStatusesSettings />, {
      wrapperProps: { permissions: noCasesSettingsPermission() },
    });

    expect(screen.queryByTestId('case-statuses-section')).not.toBeInTheDocument();
  });
});
