/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type {
  BoostProfile,
  BoostRuleMatch,
  DataStreamsBoostProfile,
  IndicesBoostProfile,
} from '../../../common/types';
import { getManagedProfileMessage } from '../../translations';
import type { ProjectDefaultFlyoutProps } from './project_default_flyout';
import { ProjectDefaultFlyout } from './project_default_flyout';

const GIB = 1024 ** 3;

const matches = (...names: string[]): BoostRuleMatch[] =>
  names.map((name) => ({ name, isHidden: false }));

const indicesProfile = (name: string, isBuiltin = true): IndicesBoostProfile => ({
  name,
  is_builtin: isBuiltin,
  type: 'indices',
  min_boost: 1,
  max_boost: 1,
  availability: 'base',
  prewarm: true,
  pinned: true,
});

const dataStreamsProfile = (name: string, isBuiltin = true): DataStreamsBoostProfile => ({
  name,
  is_builtin: isBuiltin,
  type: 'data_streams',
  recent: { min_boost: 2, max_boost: 5000, max_age: '1d' },
  standard: { min_boost: 1, max_boost: 10, max_age: '7d' },
  background: { min_boost: 0, max_boost: 1 },
});

const profiles: BoostProfile[] = [
  indicesProfile('default_indices'),
  indicesProfile('catalog-fast', false),
  indicesProfile('archive-cheap', false),
  dataStreamsProfile('default_data_streams_7d'),
  {
    ...dataStreamsProfile('data_streams_1d'),
    standard: { min_boost: 1, max_boost: 10, max_age: '1d' },
  },
  dataStreamsProfile('data_streams_3d'),
  dataStreamsProfile('logs-recent-week', false),
];

const dataStreamsProps = {
  type: 'data_streams',
  ruleName: 'default_data_streams',
  selectedProfileName: 'default_data_streams_7d',
} as const;

const defaultProps: ProjectDefaultFlyoutProps = {
  type: 'indices',
  ruleName: 'default_indices',
  profiles,
  selectedProfileName: 'default_indices',
  onCreateProfile: jest.fn(),
  onSave: jest.fn(),
  onClose: jest.fn(),
};

const renderFlyout = (props: Partial<ProjectDefaultFlyoutProps> = {}) => {
  const allProps = { ...defaultProps, ...props };
  render(<ProjectDefaultFlyout {...allProps} />);
  return allProps;
};

describe('ProjectDefaultFlyout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the title and a subtitle naming the default rule', () => {
    renderFlyout();

    expect(screen.getByText('Edit project default for indices')).toBeInTheDocument();
    expect(
      screen.getByText(
        'All indices in your project use this boost profile unless a boost rule assigns a different one. Changing it updates "default_indices", the default rule.'
      )
    ).toBeInTheDocument();
  });

  it('shows the data streams variant', () => {
    renderFlyout(dataStreamsProps);

    expect(screen.getByText('Edit project default for data streams')).toBeInTheDocument();
    expect(screen.getByText(/^All data streams in your project/)).toBeInTheDocument();
  });

  it('offers the managed profiles of the type ordered by cost, then the custom option', () => {
    renderFlyout(dataStreamsProps);

    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([
      'data_streams_1d',
      'data_streams_3d',
      'default_data_streams_7d',
      'custom',
    ]);
  });

  it('marks the out-of-the-box profile as default and checks the current one', () => {
    renderFlyout({ ...dataStreamsProps, selectedProfileName: 'data_streams_1d' });

    const [badge] = screen.getAllByTestId('searchBoostProjectDefaultBadge');
    expect(screen.getAllByTestId('searchBoostProjectDefaultBadge')).toHaveLength(1);
    expect(badge).toHaveTextContent('Default');
    expect(
      screen.getByRole<HTMLInputElement>('radio', { name: /Last 7 days/ }).labels?.[0]
    ).toContainElement(badge);
    expect(screen.getByRole('radio', { name: /Last 1 day/ })).toBeChecked();
  });

  it('shows no default badge for indices, whose profile is already labeled default', () => {
    renderFlyout();

    expect(screen.getByRole('radio', { name: /^Default/ })).toBeChecked();
    expect(screen.queryByTestId('searchBoostProjectDefaultBadge')).not.toBeInTheDocument();
  });

  it('shows the name without a description for a built-in profile with no managed text', () => {
    renderFlyout({
      profiles: [indicesProfile('_converted_indices')],
      selectedProfileName: '_converted_indices',
    });

    const radio = screen.getByRole('radio', { name: '_converted_indices' });
    expect(radio).toBeChecked();
    expect(radio).toHaveAccessibleDescription('');
  });

  it('reads the description of a managed profile with its name', () => {
    renderFlyout(dataStreamsProps);

    expect(screen.getByRole('radio', { name: /Last 3 days/ })).toHaveAccessibleName(
      `Last 3 days ${getManagedProfileMessage('data_streams_3d')?.description}`
    );
  });

  it('saves the chosen managed profile', async () => {
    const { onSave } = renderFlyout(dataStreamsProps);

    await userEvent.click(screen.getByRole('radio', { name: /Last 3 days/ }));
    await userEvent.click(screen.getByTestId('searchBoostProjectDefaultSave'));

    expect(onSave).toHaveBeenCalledWith('data_streams_3d');
  });

  it('checks the custom option with the current custom profile selected', () => {
    renderFlyout({ selectedProfileName: 'catalog-fast' });

    expect(screen.getByRole('radio', { name: 'Custom boost profile' })).toBeChecked();
    expect(screen.getByTestId('searchBoostProjectDefaultCustomSelect')).toHaveTextContent(
      'catalog-fast'
    );
  });

  it('enables the select once the custom option is chosen, and saves the selected profile', async () => {
    const { onSave } = renderFlyout();
    const select = screen.getByTestId('searchBoostProjectDefaultCustomSelect');

    expect(select).toBeDisabled();

    await userEvent.click(screen.getByRole('radio', { name: 'Custom boost profile' }));

    expect(select).toBeEnabled();
    expect(select).toHaveTextContent('Select a profile');
    expect(screen.getByTestId('searchBoostProjectDefaultSave')).toBeDisabled();

    await userEvent.click(select);
    await userEvent.click(screen.getByRole('option', { name: 'archive-cheap' }));
    await userEvent.click(screen.getByTestId('searchBoostProjectDefaultSave'));

    expect(onSave).toHaveBeenCalledWith('archive-cheap');
  });

  it('restores the chosen custom profile when the custom option is checked again', async () => {
    const { onSave } = renderFlyout({
      ...dataStreamsProps,
      selectedProfileName: 'logs-recent-week',
    });
    const select = screen.getByTestId('searchBoostProjectDefaultCustomSelect');

    await userEvent.click(screen.getByRole('radio', { name: /Last 1 day/ }));

    expect(select).toBeDisabled();
    expect(select).toHaveTextContent('logs-recent-week');

    await userEvent.click(screen.getByRole('radio', { name: 'Custom boost profile' }));

    expect(select).toBeEnabled();
    expect(select).toHaveTextContent('logs-recent-week');

    await userEvent.click(screen.getByTestId('searchBoostProjectDefaultSave'));

    expect(onSave).toHaveBeenCalledWith('logs-recent-week');
  });

  it('keeps the select disabled when there are no custom profiles of the type', async () => {
    renderFlyout({
      profiles: profiles.filter(({ is_builtin: isBuiltin }) => isBuiltin),
    });

    await userEvent.click(screen.getByRole('radio', { name: 'Custom boost profile' }));

    const select = screen.getByTestId('searchBoostProjectDefaultCustomSelect');
    expect(select).toBeDisabled();
    expect(select).toHaveTextContent('No custom profiles yet');

    await userEvent.hover(screen.getByTestId('searchBoostProjectDefaultNoCustomTooltip'));

    expect(
      await screen.findByText('Create an indices boost profile to use one here.')
    ).toBeInTheDocument();
  });

  it('shows why the select is disabled to keyboard users too', async () => {
    renderFlyout({
      profiles: profiles.filter(({ is_builtin: isBuiltin }) => isBuiltin),
    });
    const trigger = screen.getByTestId('searchBoostProjectDefaultNoCustomTrigger');

    act(() => trigger.focus());

    expect(
      await screen.findByText('Create an indices boost profile to use one here.')
    ).toBeInTheDocument();
    expect(trigger).toHaveAccessibleDescription('Create an indices boost profile to use one here.');
  });

  it('turns off save when the selected profile is no longer offered', () => {
    const { rerender } = render(
      <ProjectDefaultFlyout {...defaultProps} selectedProfileName="catalog-fast" />
    );
    expect(screen.getByTestId('searchBoostProjectDefaultSave')).toBeEnabled();

    rerender(
      <ProjectDefaultFlyout
        {...defaultProps}
        profiles={profiles.filter(({ name }) => name !== 'catalog-fast')}
        selectedProfileName="catalog-fast"
      />
    );

    expect(screen.getByTestId('searchBoostProjectDefaultSave')).toBeDisabled();
  });

  it('calls back to create a profile and to close', async () => {
    const { onCreateProfile, onClose, onSave } = renderFlyout();

    await userEvent.click(screen.getByTestId('searchBoostProjectDefaultCreateProfile'));
    expect(onCreateProfile).toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('searchBoostProjectDefaultCancel'));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('hides the applies to footer without its data', () => {
    renderFlyout();

    expect(screen.queryByTestId('searchBoostAppliesToFooter')).not.toBeInTheDocument();
  });

  it('shows what the default rule applies to', () => {
    renderFlyout({ matches: matches('products', 'users'), storageSizeInBytes: 2.1 * GIB });

    expect(screen.getByTestId('searchBoostAppliesToCount')).toHaveTextContent('2 indices');
    expect(screen.getByTestId('searchBoostAppliesToSize')).toHaveTextContent('2.1 GB');
  });

  it('lists what the default rule applies to from the count badge', async () => {
    renderFlyout({ matches: matches('products', 'users'), storageSizeInBytes: 2.1 * GIB });

    await userEvent.click(
      screen.getByRole('button', { name: '2 indices. Show what this applies to' })
    );

    expect(await screen.findByTestId('searchBoostMatchesPopoverList')).toHaveTextContent(
      'productsusers'
    );
  });

  it('shows the timeline of the selected profile for data streams', async () => {
    renderFlyout({
      ...dataStreamsProps,
      matches: matches('logs-nginx', 'metrics-system'),
      storageSizeInBytes: GIB,
    });

    expect(screen.getByTestId('searchBoostTimeline-period-standard')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: /Last 1 day/ }));

    expect(screen.queryByTestId('searchBoostTimeline-period-standard')).not.toBeInTheDocument();
  });
});
