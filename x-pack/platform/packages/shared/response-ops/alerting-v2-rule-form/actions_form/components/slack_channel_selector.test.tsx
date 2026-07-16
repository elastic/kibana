/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import React from 'react';
import { parse } from 'yaml';
import { SlackChannelSelector } from './slack_channel_selector';

jest.mock('../hooks/use_fetch_slack_channels', () => ({
  useFetchSlackChannels: ({
    connectorId,
    enabled,
  }: {
    connectorId: string | null;
    enabled?: boolean;
  }) => ({
    data:
      enabled && connectorId === 'slack-1'
        ? [
            { id: 'C001', name: 'general' },
            { id: 'C002', name: 'alerts' },
          ]
        : [],
    isFetching: false,
  }),
}));

const renderSelector = (props: Partial<React.ComponentProps<typeof SlackChannelSelector>> = {}) => {
  const onParamsChange = jest.fn();
  const result = render(
    <I18nProvider>
      <SlackChannelSelector
        connectorId="slack-1"
        params=""
        onParamsChange={onParamsChange}
        {...props}
      />
    </I18nProvider>
  );
  return { ...result, onParamsChange };
};

describe('SlackChannelSelector', () => {
  it('renders the channel combobox', () => {
    renderSelector();
    expect(screen.getByTestId('slackChannelSelector')).toBeInTheDocument();
  });

  it('shows channels from the hook as options after opening the dropdown', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderSelector();

    await user.click(screen.getByRole('combobox'));

    expect(screen.getByText('#general')).toBeInTheDocument();
    expect(screen.getByText('#alerts')).toBeInTheDocument();
  });

  it('is disabled when connectorId is null', () => {
    renderSelector({ connectorId: null });
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('writes the selected channel into the params YAML', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { onParamsChange } = renderSelector({ params: 'channel: ""\ntext: "hello"\n' });

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('#general'));

    expect(onParamsChange).toHaveBeenCalledTimes(1);
    const parsed = parse(onParamsChange.mock.calls[0][0]);
    expect(parsed.channel).toBe('general');
  });

  it('preserves other params fields when writing the channel', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { onParamsChange } = renderSelector({ params: 'channel: ""\ntext: "hello"\n' });

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('#alerts'));

    const parsed = parse(onParamsChange.mock.calls[0][0]);
    expect(parsed.text).toBe('hello');
    expect(parsed.channel).toBe('alerts');
  });

  it('pre-fills the selector when params already has a valid channel', () => {
    renderSelector({ params: 'channel: general\ntext: ""\n' });
    expect(screen.getByDisplayValue('#general')).toBeInTheDocument();
  });

  it('handles malformed params YAML without crashing', () => {
    expect(() => renderSelector({ params: ': invalid: [yaml' })).not.toThrow();
  });

  it('handles missing channel field in params without crashing', () => {
    expect(() => renderSelector({ params: 'text: "hello"\n' })).not.toThrow();
  });
});
