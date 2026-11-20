/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type {
  BoostProfile,
  BoostRule,
  BoostRuleListItem,
  DataStreamsBoostProfile,
  IndicesBoostProfile,
} from '../../../common/types';
import type { RuleFlyoutProps } from './rule_flyout';
import { RuleFlyout } from './rule_flyout';

const GIB = 1024 ** 3;

const indicesProfile = (name: string, isBuiltin = false): IndicesBoostProfile => ({
  name,
  is_builtin: isBuiltin,
  type: 'indices',
  min_boost: 1,
  max_boost: 1,
  availability: 'base',
  prewarm: true,
  pinned: true,
});

const dataStreamsProfile = (name: string, isBuiltin = false): DataStreamsBoostProfile => ({
  name,
  is_builtin: isBuiltin,
  type: 'data_streams',
  recent: { min_boost: 2, max_boost: 5000, max_age: '12h' },
  standard: { min_boost: 1, max_boost: 100, max_age: '3d' },
  background: { min_boost: 0, max_boost: 1 },
});

const profiles: BoostProfile[] = [
  indicesProfile('storefront-search'),
  indicesProfile('default_indices', true),
  dataStreamsProfile('clickstream-recent'),
  dataStreamsProfile('default_data_streams_7d', true),
];

const listItem = (rule: Omit<BoostRuleListItem, 'is_builtin' | 'matches'>): BoostRuleListItem => ({
  ...rule,
  is_builtin: false,
  matches: [],
});

const rules: BoostRuleListItem[] = [
  listItem({
    name: 'storefront-catalogs',
    index_pattern: 'catalog-2026-*',
    boost_profile: 'storefront-search',
    priority: 10,
    type: 'indices',
  }),
  listItem({
    name: 'mobile-clicks-weekly',
    index_pattern: 'clicks-mobile',
    boost_profile: 'clickstream-recent',
    priority: 20,
    type: 'data_streams',
  }),
];

const targets: RuleFlyoutProps['targets'] = {
  indices: [
    { name: 'products', isHidden: false, storageSizeInBytes: 5 * GIB },
    { name: 'archive-2025', isHidden: false, storageSizeInBytes: 70 * GIB },
    { name: 'archive-2024', isHidden: false, storageSizeInBytes: 70 * GIB },
    {
      name: 'catalog-2026-fall',
      isHidden: false,
      outrankedByRuleName: 'storefront-catalogs',
      storageSizeInBytes: 4 * GIB,
    },
    { name: 'archive-internal', isHidden: true, storageSizeInBytes: GIB },
  ],
  data_streams: [
    {
      name: 'clicks-mobile',
      isHidden: false,
      outrankedByRuleName: 'mobile-clicks-weekly',
      storageSizeInBytes: 10 * GIB,
    },
    { name: 'clicks-web', isHidden: false, storageSizeInBytes: 200 * GIB },
  ],
};

const indicesRule: BoostRule = {
  name: 'storefront-archive',
  index_pattern: 'archive-*',
  boost_profile: 'storefront-search',
  priority: 5,
  is_builtin: false,
};

const dataStreamsRule: BoostRule = {
  name: 'clickstream',
  index_pattern: 'clicks-*',
  boost_profile: 'clickstream-recent',
  priority: 10,
  is_builtin: false,
};

const defaultProps: RuleFlyoutProps = {
  profiles,
  rules,
  targets,
  onCreateProfile: jest.fn(),
  onSave: jest.fn(),
  onClose: jest.fn(),
};

const renderFlyout = (props: Partial<RuleFlyoutProps> = {}) => {
  const allProps = { ...defaultProps, ...props };
  render(<RuleFlyout {...allProps} />);
  return allProps;
};

const getProfileInput = () =>
  within(screen.getByTestId('searchBoostRuleFlyoutProfile')).getByTestId('comboBoxSearchInput');

const selectProfile = async (name: string) => {
  await userEvent.click(getProfileInput());
  await userEvent.click(await screen.findByTestId(`searchBoostRuleFlyoutProfileOption-${name}`));
};

const typePattern = async (pattern: string) => {
  const field = screen.getByTestId('searchBoostRuleFlyoutIndexPattern');
  await userEvent.clear(field);
  await userEvent.type(field, pattern);
};

const getTargetNames = () =>
  screen.queryAllByTestId('searchBoostRuleTargetName').map(({ textContent }) => textContent);

const save = () => userEvent.click(screen.getByTestId('searchBoostRuleFlyoutSave'));

describe('RuleFlyout', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('create mode', () => {
    it('starts empty, with the target field disabled until a profile is selected', async () => {
      renderFlyout();

      expect(screen.getByText('Create boost rule')).toBeInTheDocument();
      expect(screen.getByTestId('searchBoostRuleFlyoutName')).toHaveValue('');
      expect(screen.getByTestId('searchBoostRuleFlyoutIndexPattern')).toBeDisabled();
      expect(screen.getByTestId('searchBoostRuleFlyoutIndexPattern')).toHaveAttribute(
        'placeholder',
        'Example: products-* or products'
      );
      expect(screen.getByTestId('searchBoostRuleFlyoutPriority')).toHaveValue('0');
      expect(screen.queryByTestId('searchBoostRuleTargets')).not.toBeInTheDocument();
      expect(screen.getByTestId('searchBoostRuleFlyoutSave')).toHaveTextContent('Create rule');

      await userEvent.hover(screen.getByTestId('searchBoostRuleFlyoutIndexPatternTip'));
      expect(
        await screen.findByText('Select a boost profile to choose targets.')
      ).toBeInTheDocument();
    });

    it('shows the errors on save, and does not save', async () => {
      const { onSave } = renderFlyout();

      await save();

      expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
      expect(screen.getByText('Select a boost profile.')).toBeInTheDocument();
      expect(screen.getByText('Enter a pattern or name.')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it.each([
      [
        'Storefront',
        'Use lowercase letters, numbers, hyphens, and underscores, starting with a letter or number.',
      ],
      ['storefront-catalogs', 'A boost rule with this name already exists.'],
    ])('rejects the name %p', async (name, error) => {
      renderFlyout();

      await userEvent.type(screen.getByTestId('searchBoostRuleFlyoutName'), name);
      await save();

      expect(await screen.findByText(error)).toBeInTheDocument();
    });

    it('offers the profiles grouped by type and sorted by name, with managed ones marked', async () => {
      renderFlyout();

      await userEvent.click(getProfileInput());

      const options = await screen.findAllByRole('option');
      expect(options.map(({ textContent }) => textContent)).toEqual([
        'default_indicesManaged',
        'storefront-search',
        'clickstream-recent',
        'default_data_streams_7d' + 'Managed',
      ]);
      expect(screen.getByText('Indices')).toBeInTheDocument();
      expect(screen.getByText('Data streams')).toBeInTheDocument();
    });

    it('shows the type of the selected profile and lists its targets', async () => {
      renderFlyout();

      await selectProfile('storefront-search');

      expect(screen.getByTestId('searchBoostRuleFlyoutProfileType')).toHaveTextContent('Indices');
      expect(screen.getByTestId('searchBoostRuleFlyoutIndexPattern')).toBeEnabled();
      expect(screen.getByTestId('searchBoostRuleTargetsTitle')).toHaveTextContent(
        'Enter a pattern or select an index'
      );
      expect(getTargetNames()).toEqual([
        'archive-2024',
        'archive-2025',
        'catalog-2026-fall',
        'products',
      ]);
    });

    it.each([
      ['emptied', '{Control>}a{/Control}{Backspace}'],
      ['left with text that matches no profile', 'xyz'],
    ])('restores the selected profile when the field is %s', async (_description, keys) => {
      renderFlyout();

      await selectProfile('storefront-search');
      await userEvent.click(getProfileInput());
      await userEvent.keyboard(keys);
      await userEvent.click(screen.getByTestId('searchBoostRuleFlyoutName'));

      expect(screen.getByTestId('searchBoostRuleFlyoutProfileType')).toHaveTextContent('Indices');
      expect(getProfileInput()).toHaveValue('storefront-search');
    });

    it('narrows the list to exact matches, counting hidden ones, and shows what the rule applies to', async () => {
      renderFlyout();

      await selectProfile('storefront-search');
      await typePattern('archive-*');

      expect(screen.getByTestId('searchBoostRuleTargetsTitle')).toHaveTextContent(
        '3 exact matches'
      );
      expect(getTargetNames()).toEqual(['archive-2024', 'archive-2025']);
      expect(screen.getByTestId('searchBoostAppliesToCount')).toHaveTextContent('3 indices');
      expect(screen.getByTestId('searchBoostAppliesToSize')).toHaveTextContent('141 GB');
    });

    it('lists partial matches when nothing matches exactly, without an applies to footer', async () => {
      renderFlyout();

      await selectProfile('storefront-search');
      await typePattern('catalog');

      expect(screen.getByTestId('searchBoostRuleTargetsTitle')).toHaveTextContent(
        '1 partial match'
      );
      expect(getTargetNames()).toEqual(['catalog-2026-fall']);
      expect(screen.getByTestId('searchBoostRuleTarget-catalog-2026-fall')).toBeDisabled();
      expect(screen.getByTestId('searchBoostRuleTargetOutrankedBy')).toHaveTextContent(
        'storefront-catalogs'
      );
      expect(screen.queryByTestId('searchBoostAppliesToFooter')).not.toBeInTheDocument();
    });

    it('says when nothing matches', async () => {
      renderFlyout();

      await selectProfile('storefront-search');
      await typePattern('users');

      expect(screen.getByTestId('searchBoostRuleTargetsTitle')).toHaveTextContent('0 matches');
      expect(screen.getByTestId('searchBoostRuleTargetsEmpty')).toHaveTextContent(
        'No matches detected'
      );
    });

    it('fills the field with the target the user clicks', async () => {
      renderFlyout();

      await selectProfile('storefront-search');
      await userEvent.click(screen.getByTestId('searchBoostRuleTarget-products'));

      expect(screen.getByTestId('searchBoostRuleFlyoutIndexPattern')).toHaveValue('products');
      expect(getTargetNames()).toEqual(['products']);
    });

    it('clears the field and focuses it again', async () => {
      renderFlyout();

      await selectProfile('storefront-search');
      await typePattern('archive-*');
      await userEvent.click(screen.getByTestId('searchBoostRuleFlyoutIndexPatternClear'));

      expect(screen.getByTestId('searchBoostRuleFlyoutIndexPattern')).toHaveValue('');
      expect(screen.getByTestId('searchBoostRuleFlyoutIndexPattern')).toHaveFocus();
    });

    it('shows unmatched and hidden targets from the list options', async () => {
      renderFlyout();

      await selectProfile('storefront-search');
      await typePattern('archive-*');
      await userEvent.click(screen.getByTestId('searchBoostRuleTargetsOptions'));
      await userEvent.click(screen.getByTestId('searchBoostRuleTargetsShowUnmatched'));

      expect(getTargetNames()).toEqual([
        'archive-2024',
        'archive-2025',
        'catalog-2026-fall',
        'products',
      ]);

      await userEvent.click(screen.getByTestId('searchBoostRuleTargetsShowHidden'));

      expect(getTargetNames()).toEqual([
        'archive-2024',
        'archive-2025',
        'archive-internal',
        'catalog-2026-fall',
        'products',
      ]);
    });

    it('explains why a list option is off', async () => {
      renderFlyout({ targets: { ...targets, data_streams: [targets.data_streams[1]] } });

      await selectProfile('clickstream-recent');
      await userEvent.click(screen.getByTestId('searchBoostRuleTargetsOptions'));

      expect(screen.getByTestId('searchBoostRuleTargetsShowUnmatched')).toBeDisabled();
      expect(screen.getByTestId('searchBoostRuleTargetsShowHidden')).toBeDisabled();

      await userEvent.hover(screen.getByTestId('searchBoostRuleTargetsShowHiddenTip'));
      expect(await screen.findByText('There are no hidden data streams.')).toBeInTheDocument();
    });

    it('takes only digits as the priority, and turns an empty one into 0', async () => {
      renderFlyout();
      const priority = screen.getByTestId('searchBoostRuleFlyoutPriority');

      await userEvent.clear(priority);
      await userEvent.type(priority, '1a2-');
      expect(priority).toHaveValue('12');

      await userEvent.clear(priority);
      await userEvent.tab();
      expect(priority).toHaveValue('0');
    });

    it('reports a priority tie with another rule, and clears it when the priority changes', async () => {
      const { onSave } = renderFlyout();

      await userEvent.type(screen.getByTestId('searchBoostRuleFlyoutName'), 'storefront-archive');
      await selectProfile('storefront-search');
      await typePattern('catalog-*');
      await userEvent.clear(screen.getByTestId('searchBoostRuleFlyoutPriority'));
      await userEvent.type(screen.getByTestId('searchBoostRuleFlyoutPriority'), '10');
      await save();

      expect(await screen.findByText('Ties with rule "storefront-catalogs".')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();

      await userEvent.type(screen.getByTestId('searchBoostRuleFlyoutPriority'), '0');

      await waitFor(() =>
        expect(screen.queryByText('Ties with rule "storefront-catalogs".')).not.toBeInTheDocument()
      );
    });

    it('saves the rule', async () => {
      const { onSave } = renderFlyout();

      await userEvent.type(screen.getByTestId('searchBoostRuleFlyoutName'), 'storefront-archive');
      await selectProfile('storefront-search');
      await typePattern('archive-*');
      await userEvent.clear(screen.getByTestId('searchBoostRuleFlyoutPriority'));
      await userEvent.type(screen.getByTestId('searchBoostRuleFlyoutPriority'), '5');
      await save();

      await waitFor(() =>
        expect(onSave).toHaveBeenCalledWith({
          name: 'storefront-archive',
          boost_profile: 'storefront-search',
          index_pattern: 'archive-*',
          priority: 5,
        })
      );
    });

    it('selects the profile the user creates from the link', async () => {
      const onCreateProfile = jest.fn().mockResolvedValue('clickstream-recent');
      renderFlyout({ onCreateProfile });

      await userEvent.click(screen.getByTestId('searchBoostRuleFlyoutCreateProfile'));

      expect(onCreateProfile).toHaveBeenCalledWith(undefined);
      await waitFor(() =>
        expect(screen.getByTestId('searchBoostRuleFlyoutProfileType')).toHaveTextContent(
          'Data streams'
        )
      );
    });

    it('keeps the selection when no profile is created', async () => {
      renderFlyout({ onCreateProfile: jest.fn().mockResolvedValue(undefined) });

      await selectProfile('storefront-search');
      await userEvent.click(screen.getByTestId('searchBoostRuleFlyoutCreateProfile'));

      expect(getProfileInput()).toHaveValue('storefront-search');
    });
  });

  describe('edit mode', () => {
    it('edits the rule without a name field, listing only profiles of its type', async () => {
      renderFlyout({ rule: indicesRule });

      expect(screen.getByText('Edit boost rule "storefront-archive"')).toBeInTheDocument();
      expect(screen.queryByTestId('searchBoostRuleFlyoutName')).not.toBeInTheDocument();
      expect(
        screen.getByText(
          "Lists only indices profiles, since a rule can't switch types after it's created."
        )
      ).toBeInTheDocument();
      expect(getProfileInput()).toHaveValue('storefront-search');
      expect(screen.getByTestId('searchBoostRuleFlyoutIndexPattern')).toHaveValue('archive-*');
      expect(screen.getByTestId('searchBoostRuleFlyoutPriority')).toHaveValue('5');
      expect(screen.getByTestId('searchBoostRuleFlyoutSave')).toHaveTextContent('Save changes');

      await userEvent.click(getProfileInput());

      const options = await screen.findAllByRole('option');
      expect(options.map(({ textContent }) => textContent)).toEqual([
        'default_indicesManaged',
        'storefront-search',
      ]);
    });

    it('saves the changes under the same name', async () => {
      const { onSave } = renderFlyout({ rule: indicesRule });

      await userEvent.type(screen.getByTestId('searchBoostRuleFlyoutPriority'), '0');
      await save();

      await waitFor(() =>
        expect(onSave).toHaveBeenCalledWith({
          name: 'storefront-archive',
          boost_profile: 'storefront-search',
          index_pattern: 'archive-*',
          priority: 50,
        })
      );
    });

    it('opens the profile flyout with the type fixed', async () => {
      const onCreateProfile = jest.fn().mockResolvedValue(undefined);
      renderFlyout({ rule: indicesRule, onCreateProfile });

      await userEvent.click(screen.getByTestId('searchBoostRuleFlyoutCreateProfile'));

      expect(onCreateProfile).toHaveBeenCalledWith('indices');
    });

    it('shows the timeline of the profile for a data streams rule', () => {
      renderFlyout({ rule: dataStreamsRule });

      expect(screen.getByTestId('searchBoostAppliesToCount')).toHaveTextContent('1 data stream');
      expect(screen.getByTestId('searchBoostAppliesToSize')).toHaveTextContent('200 GB');
      expect(screen.getByTestId('searchBoostTimeline-period-standard')).toBeInTheDocument();
    });

    it('disables the fields while saving', () => {
      renderFlyout({ rule: indicesRule, isSaving: true });

      expect(screen.getByTestId('searchBoostRuleFlyoutIndexPattern')).toBeDisabled();
      expect(screen.getByTestId('searchBoostRuleFlyoutPriority')).toBeDisabled();
      expect(getProfileInput()).toBeDisabled();
      expect(screen.getByTestId('searchBoostRuleFlyoutSave')).toBeDisabled();
      expect(screen.getByTestId('searchBoostRuleTarget-archive-2024')).toBeDisabled();
    });
  });
});
