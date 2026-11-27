/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
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
    { name: 'products', storageSizeInBytes: 5 * GIB },
    { name: 'archive-2025', storageSizeInBytes: 70 * GIB },
    { name: 'archive-2024', storageSizeInBytes: 70 * GIB },
    {
      name: 'catalog-2026-fall',
      outrankedByRuleName: 'storefront-catalogs',
      storageSizeInBytes: 4 * GIB,
    },
    { name: 'archive-internal', storageSizeInBytes: GIB },
  ],
  data_streams: [
    {
      name: 'clicks-mobile',
      outrankedByRuleName: 'mobile-clicks-weekly',
      storageSizeInBytes: 10 * GIB,
    },
    { name: 'clicks-web', storageSizeInBytes: 200 * GIB },
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
  const { rerender } = render(<RuleFlyout {...allProps} />);
  return {
    ...allProps,
    rerender: (changes: Partial<RuleFlyoutProps>) =>
      rerender(<RuleFlyout {...allProps} {...changes} />),
  };
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
      expect(screen.getByTestId('searchBoostRuleFlyoutPriority')).toHaveValue(0);
      expect(screen.queryByTestId('searchBoostRuleTargets')).not.toBeInTheDocument();
      expect(screen.getByTestId('searchBoostRuleFlyoutSave')).toHaveTextContent('Create rule');

      await userEvent.hover(screen.getByTestId('searchBoostRuleFlyoutIndexPatternTip'));
      expect(
        await screen.findByText('Select a boost profile to choose targets.')
      ).toBeInTheDocument();
    });

    it('shows why the target field is disabled to keyboard users too', async () => {
      renderFlyout();
      const trigger = screen.getByTestId('searchBoostRuleFlyoutIndexPatternTrigger');

      act(() => trigger.focus());

      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip).toHaveTextContent('Select a boost profile to choose targets.');
      expect(trigger).toHaveAttribute('aria-describedby', tooltip.id);
    });

    it('stops offering the tooltip once a profile is selected', async () => {
      renderFlyout();

      await selectProfile('storefront-search');

      expect(
        screen.queryByTestId('searchBoostRuleFlyoutIndexPatternTrigger')
      ).not.toBeInTheDocument();
    });

    it('shows the errors on save, and does not save', async () => {
      const { onSave } = renderFlyout();

      await save();

      expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
      expect(screen.getByText('Select a boost profile.')).toBeInTheDocument();
      expect(screen.getByText('Enter a pattern or name.')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('checks a field once the user leaves it, then as the user types', async () => {
      renderFlyout();

      await selectProfile('storefront-search');
      const field = screen.getByTestId('searchBoostRuleFlyoutIndexPattern');

      await userEvent.type(field, 'logs-*,');
      expect(
        screen.queryByText('Enter one pattern or name, without commas or spaces.')
      ).not.toBeInTheDocument();

      await userEvent.tab();
      expect(
        await screen.findByText('Enter one pattern or name, without commas or spaces.')
      ).toBeInTheDocument();
      expect(field).toBeInvalid();

      await userEvent.type(field, '{backspace}');
      await waitFor(() => expect(field).not.toBeInvalid());
    });

    it('asks for a name once the user leaves the field empty', async () => {
      renderFlyout();

      await userEvent.click(screen.getByTestId('searchBoostRuleFlyoutName'));
      expect(screen.queryByText('Enter a name.')).not.toBeInTheDocument();

      await userEvent.tab();

      expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
    });

    it('asks for a profile once the user leaves the picker without choosing one', async () => {
      renderFlyout();

      await userEvent.click(getProfileInput());
      expect(screen.queryByText('Select a boost profile.')).not.toBeInTheDocument();

      await userEvent.tab();

      expect(await screen.findByText('Select a boost profile.')).toBeInTheDocument();
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
        'archive-internal',
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

    it('narrows the list to exact matches and shows what the rule applies to', async () => {
      renderFlyout();

      await selectProfile('storefront-search');
      await typePattern('archive-*');

      expect(screen.getByTestId('searchBoostRuleTargetsTitle')).toHaveTextContent(
        '3 exact matches'
      );
      expect(getTargetNames()).toEqual(['archive-2024', 'archive-2025', 'archive-internal']);
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
      const target = screen.getByTestId('searchBoostRuleTarget-catalog-2026-fall');
      expect(target).toHaveAttribute('aria-disabled', 'true');
      expect(target).toHaveAccessibleName(/^Partial match .* Outranked by storefront-catalogs$/);
      expect(screen.getByTestId('searchBoostRuleTargetOutrankedBy')).toHaveTextContent(
        'storefront-catalogs'
      );
      expect(screen.queryByTestId('searchBoostAppliesToFooter')).not.toBeInTheDocument();
    });

    it('announces an outranked target and shows its priority hint on hover and focus without selecting it', async () => {
      renderFlyout();

      await selectProfile('storefront-search');
      const target = screen.getByTestId('searchBoostRuleTarget-catalog-2026-fall');

      expect(target).toHaveAccessibleName('catalog-2026-fall Outranked by storefront-catalogs');

      await userEvent.hover(screen.getByTestId('searchBoostRuleTargetTip-catalog-2026-fall'));
      expect(
        await screen.findByText(
          '"storefront-catalogs" ranks higher, so it applies instead. To outrank it, increase this rule\'s priority.'
        )
      ).toBeInTheDocument();
      await userEvent.unhover(screen.getByTestId('searchBoostRuleTargetTip-catalog-2026-fall'));

      act(() => target.focus());

      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip).toHaveTextContent(
        '"storefront-catalogs" ranks higher, so it applies instead. To outrank it, increase this rule\'s priority.'
      );
      expect(target).toHaveAttribute('aria-describedby', tooltip.id);

      // `aria-disabled` keeps the row focusable, so check that Enter doesn't fill the pattern field with it.
      await userEvent.keyboard('{Enter}');
      expect(screen.getByTestId('searchBoostRuleFlyoutIndexPattern')).toHaveValue('');
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

    it('shows unmatched targets from the list options', async () => {
      renderFlyout();

      await selectProfile('storefront-search');
      await typePattern('archive-*');
      await userEvent.click(screen.getByTestId('searchBoostRuleTargetsOptions'));
      expect(
        screen.queryByTestId('searchBoostRuleTargetsShowUnmatchedTrigger')
      ).not.toBeInTheDocument();
      await userEvent.click(screen.getByTestId('searchBoostRuleTargetsShowUnmatched'));

      expect(getTargetNames()).toEqual([
        'archive-2024',
        'archive-2025',
        'archive-internal',
        'catalog-2026-fall',
        'products',
      ]);
    });

    it('explains why "Show unmatched" is off before anything is typed', async () => {
      renderFlyout();

      await selectProfile('storefront-search');
      await userEvent.click(screen.getByTestId('searchBoostRuleTargetsOptions'));

      expect(screen.getByTestId('searchBoostRuleTargetsShowUnmatched')).toBeDisabled();

      await userEvent.hover(screen.getByTestId('searchBoostRuleTargetsShowUnmatchedTip'));
      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        "The list isn't filtered until you enter a pattern or name."
      );
    });

    it('shows why "Show unmatched" is off to keyboard users too', async () => {
      renderFlyout();

      await selectProfile('storefront-search');
      await userEvent.click(screen.getByTestId('searchBoostRuleTargetsOptions'));
      const trigger = screen.getByTestId('searchBoostRuleTargetsShowUnmatchedTrigger');
      expect(screen.getByRole('switch', { name: 'Show unmatched' })).toBe(trigger);
      expect(trigger).toHaveAttribute('aria-disabled', 'true');
      expect(trigger).not.toBeChecked();
      // Described before the tooltip shows, so screen readers announce the reason with the focus.
      expect(trigger).toHaveAccessibleDescription(
        "The list isn't filtered until you enter a pattern or name."
      );

      act(() => trigger.focus());

      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        "The list isn't filtered until you enter a pattern or name."
      );
    });

    it.each([
      ['empty', ''],
      ['pasted negative', '-3'],
      ['pasted decimal', '1.5'],
    ])('turns a %s priority into 0 when leaving the field', async (_description, value) => {
      renderFlyout();
      const priority = screen.getByTestId('searchBoostRuleFlyoutPriority');

      await userEvent.clear(priority);
      if (value) {
        await userEvent.paste(value);
      }
      await userEvent.tab();

      expect(priority).toHaveValue(0);
    });

    it('ignores keys that cannot be part of a non-negative integer priority', async () => {
      renderFlyout();
      const priority = screen.getByTestId('searchBoostRuleFlyoutPriority');

      await userEvent.clear(priority);
      await userEvent.type(priority, '-1e.2+');

      expect(priority).toHaveValue(12);
    });

    it('keeps a non-negative integer priority when leaving the field', async () => {
      renderFlyout();
      const priority = screen.getByTestId('searchBoostRuleFlyoutPriority');

      await userEvent.clear(priority);
      await userEvent.type(priority, '12');
      await userEvent.tab();

      expect(priority).toHaveValue(12);
    });

    it.each([
      ['priority', () => userEvent.type(screen.getByTestId('searchBoostRuleFlyoutPriority'), '1')],
      ['pattern', () => typePattern('catalog-2027-*')],
    ])(
      'shows and focuses the tie reported on save, and clears it when the %s changes',
      async (_field, change) => {
        const { onSave, rerender } = renderFlyout();

        await userEvent.type(screen.getByTestId('searchBoostRuleFlyoutName'), 'storefront-archive');
        await selectProfile('storefront-search');
        await typePattern('catalog-*');
        await save();
        await waitFor(() => expect(onSave).toHaveBeenCalled());
        rerender({ tiedRuleName: 'storefront-catalogs' });

        expect(
          await screen.findByText('Ties with rule "storefront-catalogs".')
        ).toBeInTheDocument();
        await waitFor(() =>
          expect(screen.getByTestId('searchBoostRuleFlyoutPriority')).toHaveFocus()
        );

        await change();

        await waitFor(() =>
          expect(
            screen.queryByText('Ties with rule "storefront-catalogs".')
          ).not.toBeInTheDocument()
        );
      }
    );

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
      expect(screen.getByTestId('searchBoostRuleFlyoutPriority')).toHaveValue(5);
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

    it("asks for a profile when the rule's profile isn't among the profiles", async () => {
      const { onSave } = renderFlyout({ rule: { ...indicesRule, boost_profile: 'missing' } });

      expect(getProfileInput()).toHaveValue('');

      await save();

      expect(await screen.findByText('Select a boost profile.')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it("keeps the rule's type when its profile isn't among the profiles", async () => {
      const onCreateProfile = jest.fn().mockResolvedValue(undefined);
      renderFlyout({
        rule: {
          name: 'storefront-catalogs',
          index_pattern: 'catalog-2026-*',
          boost_profile: 'missing',
          priority: 10,
          is_builtin: false,
        },
        onCreateProfile,
      });

      expect(
        screen.getByText(
          "Lists only indices profiles, since a rule can't switch types after it's created."
        )
      ).toBeInTheDocument();

      await userEvent.click(getProfileInput());
      const options = await screen.findAllByRole('option');
      expect(options.map(({ textContent }) => textContent)).toEqual([
        'default_indicesManaged',
        'storefront-search',
      ]);

      await userEvent.click(screen.getByTestId('searchBoostRuleFlyoutCreateProfile'));
      expect(onCreateProfile).toHaveBeenCalledWith('indices');
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

    it('matches nothing with a pattern over the length limit', async () => {
      renderFlyout({ rule: indicesRule });
      const field = screen.getByTestId('searchBoostRuleFlyoutIndexPattern');
      expect(screen.getByTestId('searchBoostAppliesToFooter')).toBeInTheDocument();

      // Under the limit, this would match every index.
      await userEvent.clear(field);
      await userEvent.paste('*'.repeat(256));

      expect(screen.getByTestId('searchBoostRuleTargetsTitle')).toHaveTextContent('0 matches');
      expect(screen.getByTestId('searchBoostRuleTargetsEmpty')).toHaveTextContent(
        'No matches detected'
      );
      expect(screen.queryByTestId('searchBoostAppliesToFooter')).not.toBeInTheDocument();

      await userEvent.tab();
      expect(await screen.findByText('Use 255 bytes or fewer.')).toBeInTheDocument();
    });

    it('hides the applies to footer while save reports a tie', async () => {
      const { onSave, rerender } = renderFlyout({ rule: indicesRule });
      expect(screen.getByTestId('searchBoostAppliesToFooter')).toBeInTheDocument();

      await save();
      await waitFor(() => expect(onSave).toHaveBeenCalled());
      rerender({ tiedRuleName: 'storefront-catalogs' });

      expect(await screen.findByText('Ties with rule "storefront-catalogs".')).toBeInTheDocument();
      expect(screen.queryByTestId('searchBoostAppliesToFooter')).not.toBeInTheDocument();

      await userEvent.type(screen.getByTestId('searchBoostRuleFlyoutPriority'), '0');

      expect(await screen.findByTestId('searchBoostAppliesToFooter')).toBeInTheDocument();
    });

    it('shows a tie and focuses the priority field only once saving ends', async () => {
      const { onSave, rerender } = renderFlyout({ rule: indicesRule });
      const priority = screen.getByTestId('searchBoostRuleFlyoutPriority');

      await save();
      await waitFor(() => expect(onSave).toHaveBeenCalled());
      rerender({ isSaving: true, tiedRuleName: 'storefront-catalogs' });

      expect(screen.queryByText('Ties with rule "storefront-catalogs".')).not.toBeInTheDocument();
      expect(priority).not.toHaveFocus();

      rerender({ tiedRuleName: 'storefront-catalogs' });

      expect(await screen.findByText('Ties with rule "storefront-catalogs".')).toBeInTheDocument();
      await waitFor(() => expect(priority).toHaveFocus());
    });

    it('shows a repeated tie again after the next save', async () => {
      const { onSave, rerender } = renderFlyout({ rule: indicesRule });

      await save();
      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
      rerender({ tiedRuleName: 'storefront-catalogs' });
      expect(await screen.findByText('Ties with rule "storefront-catalogs".')).toBeInTheDocument();

      await save();
      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
      rerender({ isSaving: true });
      expect(screen.queryByText('Ties with rule "storefront-catalogs".')).not.toBeInTheDocument();

      rerender({ tiedRuleName: 'storefront-catalogs' });

      expect(await screen.findByText('Ties with rule "storefront-catalogs".')).toBeInTheDocument();
    });

    it('keeps the tie when the user leaves the priority field without changing it', async () => {
      const { onSave, rerender } = renderFlyout({ rule: indicesRule });

      await save();
      await waitFor(() => expect(onSave).toHaveBeenCalled());
      rerender({ tiedRuleName: 'storefront-catalogs' });
      await waitFor(() =>
        expect(screen.getByTestId('searchBoostRuleFlyoutPriority')).toHaveFocus()
      );

      await userEvent.tab();

      expect(screen.getByText('Ties with rule "storefront-catalogs".')).toBeInTheDocument();
      expect(screen.queryByTestId('searchBoostAppliesToFooter')).not.toBeInTheDocument();
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
