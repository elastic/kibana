/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { CrawlScheduleStatus, LearnSettings } from '../common/types';
import type { ConnectorMemoryApi } from './api';
import { SettingsForm } from './settings_form';

const IN_FORCE: LearnSettings = {
  learn: 'reads',
  reach: 'direct',
  area: { maxFiles: 100, maxDepth: 2 },
  summarizeReads: true,
};
const SAVED: CrawlScheduleStatus = {
  status: 'idle',
  crawl: { maxDepth: 2, maxFiles: 200, mode: 'names', intervalMinutes: 1440 },
  lastRun: { at: '2026-11-04T00:00:00Z', status: 'completed' },
};

const setup = ({
  customized = false,
  isReadOnly = false,
  schedule = null as CrawlScheduleStatus | null,
  contentSource = { example: 'folder id', required: false },
  crawlEnabled = true,
  saveSettings = jest.fn().mockResolvedValue({}),
} = {}) => {
  const api = {
    saveSettings,
    resetSettings: jest.fn().mockResolvedValue({}),
    runCrawl: jest.fn().mockResolvedValue({}),
    listModels: jest.fn().mockResolvedValue([{ id: 'llm-2', name: 'Fast model' }]),
  };
  const onChanges = jest.fn();
  const user = userEvent.setup();
  renderWithI18n(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <SettingsForm
        api={api as unknown as ConnectorMemoryApi}
        connectorId="drive-1"
        contentSource={contentSource}
        settings={IN_FORCE}
        customized={customized}
        crawlEnabled={crawlEnabled}
        schedule={schedule}
        isReadOnly={isReadOnly}
        onChanges={onChanges}
      />
    </QueryClientProvider>
  );
  const last = () => onChanges.mock.calls[onChanges.mock.calls.length - 1][0];
  const pick = (name: RegExp) => user.click(screen.getByRole('radio', { name }));
  const toggleCrawl = () => user.click(screen.getByTestId('connectorMemoryCrawlEnabled'));
  return { api, user, last, pick, toggleCrawl, saveSettings };
};

const saved = (saveSettings: jest.Mock) =>
  saveSettings.mock.calls[saveSettings.mock.calls.length - 1][1];

describe('SettingsForm: what is learned', () => {
  it('starts from what is in force, reports changes only once something changed, and saves them when the flyout saves', async () => {
    const { last, pick, saveSettings } = setup();
    expect(screen.getByRole('radio', { name: /Only direct hits/ })).toBeChecked();
    expect(last()).toMatchObject({ isDirty: false, isValid: true });

    await pick(/Direct hits plus area/);
    fireEvent.change(screen.getByTestId('connectorMemoryMaxFiles'), { target: { value: '40' } });
    fireEvent.change(screen.getByTestId('connectorMemoryMaxDepth'), { target: { value: '1' } });
    expect(last()).toMatchObject({ isDirty: true, isValid: true });
    expect(saveSettings).not.toHaveBeenCalled();
    await last().save();

    expect(saved(saveSettings)).toEqual({
      learn: 'reads',
      reach: 'area',
      area: { maxFiles: 40, maxDepth: 1 },
      summarizeReads: true,
    });
  });

  it('saves "nothing" as off, with the summaries switch off, and will not save a limit the server refuses', async () => {
    const { last, pick, saveSettings } = setup();

    await pick(/Nothing/);
    expect(screen.getByTestId('connectorMemorySummarize')).toBeDisabled();
    await last().save();
    expect(saved(saveSettings)).toEqual({ learn: 'off' });

    await pick(/Direct hits plus neighbors/);
    fireEvent.change(screen.getByTestId('connectorMemoryMaxFiles'), { target: { value: '9999' } });
    expect(last()).toMatchObject({ isDirty: true, isValid: false });
  });

  it('can be looked at but not changed without permission', () => {
    const { last } = setup({ isReadOnly: true });

    expect(screen.getByRole('radio', { name: /Only direct hits/ })).toBeDisabled();
    expect(screen.getByTestId('connectorMemoryReadOnlyNote')).toBeInTheDocument();
    expect(last()).toMatchObject({ isDirty: false });
  });

  it('shows the server’s message when a change cannot be saved, and fails the save', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { last, pick } = setup({
      saveSettings: jest.fn().mockRejectedValue({ body: { message: 'Connector was not found.' } }),
    });

    await pick(/Nothing/);
    await expect(last().save()).rejects.toBeDefined();

    expect(await screen.findByTestId('connectorMemoryFormError')).toHaveTextContent(
      'Connector was not found.'
    );
  });
});

describe('SettingsForm: the scheduled crawl', () => {
  it('turning it on starts from the top with names, and is saved with the settings', async () => {
    const { last, toggleCrawl, saveSettings } = setup();

    await toggleCrawl();
    expect(last()).toMatchObject({ isDirty: true, isValid: true });
    await last().save();

    expect(saved(saveSettings).crawl).toEqual({
      maxDepth: 2,
      maxFiles: 100,
      mode: 'names',
      intervalMinutes: 1440,
    });
  });

  it('needs a starting location when the connector requires one', async () => {
    const { last, toggleCrawl, user } = setup({
      contentSource: { example: 'my-bucket/docs/', required: true },
    });

    await toggleCrawl();
    expect(last()).toMatchObject({ isValid: false });
    await user.type(screen.getByTestId('connectorMemoryCrawlFolder'), 'docs');
    expect(last()).toMatchObject({ isValid: true });
  });

  it('starts from the saved crawl, sends it only when it changed, and removes it when switched off', async () => {
    const { last, toggleCrawl, saveSettings } = setup({ schedule: SAVED, customized: true });

    expect(screen.getByTestId('connectorMemoryCrawlMaxFiles')).toHaveValue(200);
    expect(last()).toMatchObject({ isDirty: false });

    fireEvent.change(screen.getByTestId('connectorMemoryCrawlMaxFiles'), {
      target: { value: '300' },
    });
    await last().save();
    expect(saved(saveSettings).crawl).toMatchObject({ maxFiles: 300 });

    await toggleCrawl();
    await last().save();
    expect(saved(saveSettings).crawl).toBeNull();
  });

  it('offers a model only for summaries, and drops it again for names', async () => {
    const { last, user, saveSettings } = setup({
      schedule: {
        ...SAVED,
        crawl: { ...SAVED.crawl!, mode: 'full', inferenceConnectorId: 'llm-1' },
      },
    });

    const model = await screen.findByTestId('connectorMemoryCrawlModel');
    expect(model).toHaveValue('llm-1');
    await user.selectOptions(model, 'llm-2');
    await last().save();
    expect(saved(saveSettings).crawl).toMatchObject({
      mode: 'full',
      inferenceConnectorId: 'llm-2',
    });

    await user.click(screen.getByRole('radio', { name: /Names only/ }));
    expect(screen.queryByTestId('connectorMemoryCrawlModel')).not.toBeInTheDocument();
    await last().save();
    expect(saved(saveSettings).crawl).not.toHaveProperty('inferenceConnectorId');
  });

  it('runs a saved crawl now, but not while its changes are unsaved', async () => {
    const { api, user } = setup({ schedule: SAVED });

    await user.click(screen.getByTestId('connectorMemoryCrawlRunNow'));
    await waitFor(() => expect(api.runCrawl).toHaveBeenCalledWith('drive-1'));

    fireEvent.change(screen.getByTestId('connectorMemoryCrawlMaxFiles'), {
      target: { value: '300' },
    });
    expect(screen.queryByTestId('connectorMemoryCrawlRunNow')).not.toBeInTheDocument();
  });

  it('asks before resetting a customised connector', async () => {
    const { api, user } = setup({ customized: true });

    await user.click(screen.getByTestId('connectorMemoryReset'));
    expect(api.resetSettings).not.toHaveBeenCalled();
    await user.click(within(screen.getByTestId('connectorMemoryResetConfirm')).getByText('Reset'));

    await waitFor(() => expect(api.resetSettings).toHaveBeenCalledWith('drive-1'));
  });
});
