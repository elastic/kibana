/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { BoostLimits, MaxAgeUnit } from '../../../common/profile_validation';
import type { DataStreamsBoostProfile, IndicesBoostProfile } from '../../../common/types';
import type { ProfileFlyoutContentProps, ProfileFlyoutProps } from './profile_flyout';
import { ProfileFlyout, ProfileFlyoutContent } from './profile_flyout';

jest.mock('tabbable', () => {
  const actual = jest.requireActual<typeof import('tabbable')>('tabbable');
  // JSDOM has no layout, so tabbable's default display check would treat every element as hidden,
  // and a checkable card would take a click on the pinned checkbox inside it as its own.
  return {
    ...actual,
    tabbable: (...[container, options]: Parameters<typeof actual.tabbable>) =>
      actual.tabbable(container, { ...options, displayCheck: 'none' }),
  };
});

const GIB = 1024 ** 3;
const LIMITS: BoostLimits = { minBoost: 1, maxBoost: 19 };

const indicesProfile: IndicesBoostProfile = {
  name: 'storefront-search',
  is_builtin: false,
  type: 'indices',
  min_boost: 3,
  max_boost: 15,
  availability: 'one_extra_copy',
  prewarm: true,
  pinned: false,
};

const dataStreamsProfile: DataStreamsBoostProfile = {
  name: 'clickstream-recent',
  is_builtin: false,
  type: 'data_streams',
  recent: { min_boost: 2, max_boost: 19, max_age: '12h' },
  standard: { min_boost: 1, max_boost: 10, max_age: '3d' },
  background: { min_boost: 1, max_boost: 2 },
};

const onSaveFirst = jest.fn();
const onSaveSecond = jest.fn();

const defaultProps: ProfileFlyoutProps = {
  title: 'Create boost profile',
  limits: LIMITS,
  saveButtons: [
    { id: 'save', label: 'Save', onSave: onSaveFirst },
    { id: 'saveAndCreateRule', label: 'Save and create rule', onSave: onSaveSecond },
  ],
  onClose: jest.fn(),
};

const editProps = (profile: ProfileFlyoutProps['profile']): Partial<ProfileFlyoutProps> => ({
  title: `Edit boost profile "${profile?.name}"`,
  profile,
  saveButtons: [{ id: 'saveChanges', label: 'Save changes', onSave: onSaveFirst }],
});

const renderFlyout = (props: Partial<ProfileFlyoutProps> = {}) => {
  const allProps = { ...defaultProps, ...props };
  const { rerender } = render(<ProfileFlyout {...allProps} />);
  return {
    ...allProps,
    rerender: (changes: Partial<ProfileFlyoutProps>) =>
      rerender(<ProfileFlyout {...allProps} {...changes} />),
  };
};

const getField = (testSubj: string) => screen.getByTestId(testSubj);

const fill = async (testSubj: string, value: string) => {
  await userEvent.clear(getField(testSubj));
  if (value) {
    await userEvent.paste(value);
  }
};

const typeName = (name: string) => userEvent.type(getField('searchBoostProfileFlyoutName'), name);

const chooseType = (type: 'indices' | 'data_streams') =>
  userEvent.click(getField(`searchBoostProfileFlyoutTypeOption-${type}`));

const chooseUnit = async (period: 'recent' | 'standard', unit: MaxAgeUnit) => {
  await userEvent.click(getField(`searchBoostProfileFlyoutMaxAgeUnit-${period}`));
  await userEvent.click(
    await screen.findByTestId(`searchBoostProfileFlyoutMaxAgeUnitOption-${unit}`)
  );
};

const save = (id = 'save') => userEvent.click(getField(`searchBoostProfileFlyoutSave-${id}`));

describe('ProfileFlyout', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('create mode', () => {
    it('starts with the name, the type choice, and the indices fields', () => {
      renderFlyout();

      expect(screen.getByText('Create boost profile')).toBeInTheDocument();
      expect(
        screen.getByText(
          'A boost profile defines how search resources are allocated to indices or data streams. It takes effect when a boost rule assigns it.'
        )
      ).toBeInTheDocument();
      expect(screen.queryByTestId('searchBoostProfileFlyoutType')).not.toBeInTheDocument();
      expect(getField('searchBoostProfileFlyoutName')).toHaveValue('');
      expect(screen.getByRole('radio', { name: /^Indices/ })).toBeChecked();
      expect(getField('searchBoostProfileFlyoutMinBoost-indices')).toHaveValue(1);
      expect(getField('searchBoostProfileFlyoutMaxBoost-indices')).toHaveValue(19);
      expect(
        screen.getByText(/The default minimum is 1\. Enter values from 1 to 19\.$/)
      ).toBeInTheDocument();
      expect(getField('searchBoostProfileFlyoutOneExtraCopy')).not.toBeChecked();
      expect(getField('searchBoostProfileFlyoutPrewarm')).not.toBeChecked();
      expect(getField('searchBoostProfileFlyoutPinned')).toBeDisabled();
      expect(screen.queryByTestId('searchBoostProfileFlyoutLearnMore')).not.toBeInTheDocument();
    });

    it('links the boost docs when given', () => {
      renderFlyout({ docsUrl: 'https://www.elastic.co/docs/boost' });

      expect(getField('searchBoostProfileFlyoutLearnMore')).toHaveAttribute(
        'href',
        'https://www.elastic.co/docs/boost'
      );
    });

    it('shows the errors on save, and does not save', async () => {
      renderFlyout();

      await fill('searchBoostProfileFlyoutMinBoost-indices', '');
      await fill('searchBoostProfileFlyoutMaxBoost-indices', '');
      await save();

      expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
      expect(screen.getByText('Enter a minimum boost.')).toBeInTheDocument();
      expect(screen.getByText('Enter a maximum boost.')).toBeInTheDocument();
      expect(onSaveFirst).not.toHaveBeenCalled();
    });

    it('updates the errors as the user types after the first save', async () => {
      renderFlyout();

      await save();
      expect(await screen.findByText('Enter a name.')).toBeInTheDocument();

      await typeName('Storefront');
      expect(
        screen.getByText(
          'Use lowercase letters, numbers, hyphens, and underscores, starting with a letter or number.'
        )
      ).toBeInTheDocument();

      await fill('searchBoostProfileFlyoutName', 'a'.repeat(256));
      expect(screen.getByText('Use 255 characters or fewer.')).toBeInTheDocument();

      await fill('searchBoostProfileFlyoutName', 'storefront');
      await waitFor(() =>
        expect(screen.queryByText('Use 255 characters or fewer.')).not.toBeInTheDocument()
      );
    });

    it('saves an indices profile with the button the user clicks', async () => {
      renderFlyout();

      await typeName('storefront-search');
      await fill('searchBoostProfileFlyoutMinBoost-indices', '1.5');
      await fill('searchBoostProfileFlyoutMaxBoost-indices', '10');
      await userEvent.click(getField('searchBoostProfileFlyoutOneExtraCopy'));
      await userEvent.click(getField('searchBoostProfileFlyoutPrewarm'));
      await userEvent.click(getField('searchBoostProfileFlyoutPinned'));
      await save('saveAndCreateRule');

      await waitFor(() =>
        expect(onSaveSecond).toHaveBeenCalledWith({
          name: 'storefront-search',
          type: 'indices',
          min_boost: 1.5,
          max_boost: 10,
          availability: 'one_extra_copy',
          prewarm: true,
          pinned: true,
        })
      );
      expect(onSaveFirst).not.toHaveBeenCalled();
    });

    it.each([
      ['min', '0.5', 'Enter a value from 1 to 19.'],
      ['max', '20', 'Enter a value from 1 to 19.'],
      ['max', '0.5', 'Enter a value from 1 to 19.'],
    ])('rejects a %s boost of %p outside the limits', async (field, value, error) => {
      renderFlyout();

      await fill(`searchBoostProfileFlyout${field === 'min' ? 'Min' : 'Max'}Boost-indices`, value);
      await save();

      expect(await screen.findByText(error)).toBeInTheDocument();
    });

    it('checks the max boost again when the min boost changes', async () => {
      renderFlyout();

      await fill('searchBoostProfileFlyoutMinBoost-indices', '5');
      await fill('searchBoostProfileFlyoutMaxBoost-indices', '3');
      await save();

      expect(
        await screen.findByText('Maximum boost must be at least the minimum boost.')
      ).toBeInTheDocument();

      await fill('searchBoostProfileFlyoutMinBoost-indices', '2');

      await waitFor(() =>
        expect(
          screen.queryByText('Maximum boost must be at least the minimum boost.')
        ).not.toBeInTheDocument()
      );
    });

    it('keeps the max boost within the ratio limit', async () => {
      renderFlyout({ limits: { ...LIMITS, maxRatio: 4 } });

      expect(getField('searchBoostProfileFlyoutMaxBoost-indices')).toHaveValue(4);

      await fill('searchBoostProfileFlyoutMaxBoost-indices', '4.5');
      await save();

      expect(
        await screen.findByText('Maximum boost must be at most 4 times the minimum boost.')
      ).toBeInTheDocument();
    });

    it('follows the limits on the number fields', () => {
      renderFlyout({ limits: { minBoost: 0, maxBoost: 5000 } });

      const minBoost = getField('searchBoostProfileFlyoutMinBoost-indices');
      expect(minBoost).toHaveAttribute('min', '0');
      expect(minBoost).toHaveAttribute('max', '5000');
      expect(minBoost).toHaveAttribute('step', 'any');
      expect(screen.getByText(/Enter values from 0 to 5,000\.$/)).toBeInTheDocument();
    });

    it('switches to the data streams fields and saves a data streams profile', async () => {
      renderFlyout();

      await typeName('clickstream-recent');
      await chooseType('data_streams');

      expect(
        screen.queryByTestId('searchBoostProfileFlyoutOptionsSection')
      ).not.toBeInTheDocument();
      expect(screen.getByText('Recent')).toBeInTheDocument();
      expect(screen.getByText('Standard')).toBeInTheDocument();
      expect(screen.getByText('Background')).toBeInTheDocument();
      expect(getField('searchBoostProfileFlyoutMaxAge-recent')).toHaveValue(1);
      expect(getField('searchBoostProfileFlyoutMaxAge-standard')).toHaveValue(7);
      expect(
        screen.queryByTestId('searchBoostProfileFlyoutMaxAge-background')
      ).not.toBeInTheDocument();

      await fill('searchBoostProfileFlyoutMinBoost-recent', '2');
      await fill('searchBoostProfileFlyoutMaxAge-recent', '12');
      await chooseUnit('recent', 'h');
      await fill('searchBoostProfileFlyoutMaxBoost-background', '2');
      await save();

      await waitFor(() =>
        expect(onSaveFirst).toHaveBeenCalledWith({
          name: 'clickstream-recent',
          type: 'data_streams',
          recent: { min_boost: 2, max_boost: 19, max_age: '12h' },
          standard: { min_boost: 1, max_boost: 19, max_age: '7d' },
          background: { min_boost: 1, max_boost: 2 },
        })
      );
    });

    it('labels the age unit menu with the unit', async () => {
      renderFlyout({ type: 'data_streams' });

      await chooseUnit('recent', 'h');

      expect(getField('searchBoostProfileFlyoutMaxAgeUnit-recent')).toHaveAccessibleName(
        'Age unit: hours'
      );
      expect(getField('searchBoostProfileFlyoutMaxAge-recent')).toHaveAttribute('max', '87600');
    });

    it('keeps the values of each type when switching back and forth', async () => {
      renderFlyout();

      await fill('searchBoostProfileFlyoutMinBoost-indices', '3');
      await chooseType('data_streams');
      await chooseType('indices');

      expect(getField('searchBoostProfileFlyoutMinBoost-indices')).toHaveValue(3);
    });

    it.each([
      ['recent', '', 'Enter an age.'],
      ['recent', '1.5', 'Enter a whole number from 0 up to 3,650 days.'],
      ['standard', '3651', 'Enter a whole number from 0 up to 3,650 days.'],
    ] as const)('rejects a %s max age of %p', async (period, value, error) => {
      renderFlyout({ type: 'data_streams' });

      await fill(`searchBoostProfileFlyoutMaxAge-${period}`, value);
      await save();

      expect(await screen.findByText(error)).toBeInTheDocument();
    });

    it('accepts a max age of 0, which skips the period', async () => {
      renderFlyout({ type: 'data_streams' });

      await typeName('everything-background');
      await fill('searchBoostProfileFlyoutMaxAge-recent', '0');
      await fill('searchBoostProfileFlyoutMaxAge-standard', '0');
      await save();

      await waitFor(() => expect(onSaveFirst).toHaveBeenCalled());
      expect(onSaveFirst.mock.calls[0][0]).toMatchObject({
        recent: { max_age: '0d' },
        standard: { max_age: '0d' },
      });
    });

    it('keeps the standard max age at least the recent one, across units', async () => {
      renderFlyout({ type: 'data_streams' });

      await fill('searchBoostProfileFlyoutMaxAge-recent', '3');
      await fill('searchBoostProfileFlyoutMaxAge-standard', '2');
      await save();

      expect(
        await screen.findByText("Must be at least the recent phase's age.")
      ).toBeInTheDocument();

      await chooseUnit('recent', 'h');

      await waitFor(() =>
        expect(
          screen.queryByText("Must be at least the recent phase's age.")
        ).not.toBeInTheDocument()
      );
    });

    it('turns pinned on only with prewarm, and clears it when prewarm turns off', async () => {
      renderFlyout();

      await userEvent.click(getField('searchBoostProfileFlyoutPrewarm'));
      expect(getField('searchBoostProfileFlyoutPinned')).toBeEnabled();

      await userEvent.click(getField('searchBoostProfileFlyoutPinned'));
      expect(getField('searchBoostProfileFlyoutPinned')).toBeChecked();

      await userEvent.click(getField('searchBoostProfileFlyoutPrewarm'));
      expect(getField('searchBoostProfileFlyoutPinned')).not.toBeChecked();
      expect(getField('searchBoostProfileFlyoutPinned')).toBeDisabled();
    });

    it('says why pinned is off while prewarm is off, to keyboard users too', async () => {
      renderFlyout();
      const trigger = getField('searchBoostProfileFlyoutPinnedTrigger');
      expect(screen.getByRole('checkbox', { name: 'Pinned' })).toBe(trigger);
      expect(trigger).toHaveAttribute('aria-disabled', 'true');
      expect(trigger).not.toBeChecked();
      // Described before the tooltip shows, so screen readers announce the reason with the focus.
      expect(trigger).toHaveAccessibleDescription(
        'Protect cached data in proportion to min boost. Turn on prewarm to protect cached data.'
      );

      act(() => trigger.focus());

      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        'Turn on prewarm to protect cached data.'
      );
    });

    it('keeps a fixed type, showing it under the title', () => {
      renderFlyout({ type: 'data_streams', isTypeFixed: true });

      expect(getField('searchBoostProfileFlyoutType')).toHaveTextContent('Data streams');
      expect(screen.queryByTestId('searchBoostProfileFlyoutTypeSection')).not.toBeInTheDocument();
      expect(getField('searchBoostProfileFlyoutName')).toBeInTheDocument();
      expect(getField('searchBoostProfileFlyoutMaxAge-recent')).toBeInTheDocument();
    });

    it('leaves out the fixed type under a title that already names it', () => {
      renderFlyout({
        title: 'Create boost profile for the data streams default',
        type: 'data_streams',
        isTypeFixed: true,
        isTypeInTitle: true,
      });

      expect(screen.queryByTestId('searchBoostProfileFlyoutType')).not.toBeInTheDocument();
      expect(screen.queryByTestId('searchBoostProfileFlyoutTypeSection')).not.toBeInTheDocument();
      expect(getField('searchBoostProfileFlyoutMaxAge-recent')).toBeInTheDocument();
    });

    it('starts with a preset type that can still be changed', () => {
      renderFlyout({ type: 'data_streams' });

      expect(screen.queryByTestId('searchBoostProfileFlyoutType')).not.toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /^Data streams/ })).toBeChecked();
    });

    it('shows and focuses the name error reported on save once saving ends', async () => {
      const { rerender } = renderFlyout();

      await typeName('storefront-search');
      await save();
      await waitFor(() => expect(onSaveFirst).toHaveBeenCalled());
      rerender({ isSaving: true, isNameTaken: true });

      expect(
        screen.queryByText('A boost profile with this name already exists.')
      ).not.toBeInTheDocument();

      rerender({ isNameTaken: true });

      expect(
        await screen.findByText('A boost profile with this name already exists.')
      ).toBeInTheDocument();
      await waitFor(() => expect(getField('searchBoostProfileFlyoutName')).toHaveFocus());

      await userEvent.type(getField('searchBoostProfileFlyoutName'), '-2');

      await waitFor(() =>
        expect(
          screen.queryByText('A boost profile with this name already exists.')
        ).not.toBeInTheDocument()
      );
    });

    it('keeps the name error when the user leaves the name field without changing it', async () => {
      const { rerender } = renderFlyout();

      await typeName('storefront-search');
      await save();
      await waitFor(() => expect(onSaveFirst).toHaveBeenCalled());
      rerender({ isNameTaken: true });
      await waitFor(() => expect(getField('searchBoostProfileFlyoutName')).toHaveFocus());

      await userEvent.tab();

      expect(
        screen.getByText('A boost profile with this name already exists.')
      ).toBeInTheDocument();
    });

    it('shows a repeated name error again after the next save', async () => {
      const { rerender } = renderFlyout();

      await typeName('storefront-search');
      await save();
      await waitFor(() => expect(onSaveFirst).toHaveBeenCalledTimes(1));
      rerender({ isNameTaken: true });
      expect(
        await screen.findByText('A boost profile with this name already exists.')
      ).toBeInTheDocument();

      await save();
      await waitFor(() => expect(onSaveFirst).toHaveBeenCalledTimes(2));
      rerender({ isSaving: true, isNameTaken: true });
      expect(
        screen.queryByText('A boost profile with this name already exists.')
      ).not.toBeInTheDocument();

      rerender({ isNameTaken: true });

      expect(
        await screen.findByText('A boost profile with this name already exists.')
      ).toBeInTheDocument();
    });

    it('disables the fields while saving, with a spinner on the clicked button', async () => {
      const { rerender } = renderFlyout();

      await typeName('storefront-search');
      await save('saveAndCreateRule');
      await waitFor(() => expect(onSaveSecond).toHaveBeenCalled());
      rerender({ isSaving: true });

      expect(getField('searchBoostProfileFlyoutName')).toBeDisabled();
      expect(screen.getByRole('radio', { name: /^Indices/ })).toBeDisabled();
      expect(getField('searchBoostProfileFlyoutMinBoost-indices')).toBeDisabled();
      expect(getField('searchBoostProfileFlyoutPrewarm')).toBeDisabled();
      expect(getField('searchBoostProfileFlyoutSave-save')).toBeDisabled();
      expect(
        within(getField('searchBoostProfileFlyoutSave-saveAndCreateRule')).getByRole('progressbar')
      ).toBeInTheDocument();
      expect(
        within(getField('searchBoostProfileFlyoutSave-save')).queryByRole('progressbar')
      ).not.toBeInTheDocument();
    });

    it('closes without saving', async () => {
      const { onClose } = renderFlyout();

      await userEvent.click(getField('searchBoostProfileFlyoutCancel'));

      expect(onClose).toHaveBeenCalled();
      expect(onSaveFirst).not.toHaveBeenCalled();
    });
  });

  describe('edit mode', () => {
    it('prefills the profile, without the name or the type choice', () => {
      renderFlyout(editProps(indicesProfile));

      expect(screen.getByText('Edit boost profile "storefront-search"')).toBeInTheDocument();
      expect(getField('searchBoostProfileFlyoutType')).toHaveTextContent('Indices');
      expect(screen.queryByTestId('searchBoostProfileFlyoutName')).not.toBeInTheDocument();
      expect(screen.queryByTestId('searchBoostProfileFlyoutTypeSection')).not.toBeInTheDocument();
      expect(getField('searchBoostProfileFlyoutMinBoost-indices')).toHaveValue(3);
      expect(getField('searchBoostProfileFlyoutMaxBoost-indices')).toHaveValue(15);
      expect(getField('searchBoostProfileFlyoutOneExtraCopy')).toBeChecked();
      expect(getField('searchBoostProfileFlyoutPrewarm')).toBeChecked();
      expect(getField('searchBoostProfileFlyoutPinned')).not.toBeChecked();
      expect(getField('searchBoostProfileFlyoutSave-saveChanges')).toHaveTextContent(
        'Save changes'
      );
    });

    it('saves the changes under the same name', async () => {
      renderFlyout(editProps(indicesProfile));

      await userEvent.click(getField('searchBoostProfileFlyoutOneExtraCopy'));
      await save('saveChanges');

      await waitFor(() =>
        expect(onSaveFirst).toHaveBeenCalledWith({
          name: 'storefront-search',
          type: 'indices',
          min_boost: 3,
          max_boost: 15,
          availability: 'base',
          prewarm: true,
          pinned: false,
        })
      );
    });

    it('prefills the periods of a data streams profile', () => {
      renderFlyout(editProps(dataStreamsProfile));

      expect(getField('searchBoostProfileFlyoutType')).toHaveTextContent('Data streams');
      expect(getField('searchBoostProfileFlyoutMaxAge-recent')).toHaveValue(12);
      expect(getField('searchBoostProfileFlyoutMaxAgeUnit-recent')).toHaveAccessibleName(
        'Age unit: hours'
      );
      expect(getField('searchBoostProfileFlyoutMaxAge-standard')).toHaveValue(3);
      expect(getField('searchBoostProfileFlyoutMaxAgeUnit-standard')).toHaveTextContent('days');
      expect(getField('searchBoostProfileFlyoutMaxBoost-background')).toHaveValue(2);
    });

    it('hides the applies to footer without its data', () => {
      renderFlyout(editProps(indicesProfile));

      expect(screen.queryByTestId('searchBoostAppliesToFooter')).not.toBeInTheDocument();
    });

    it('shows what the profile applies to', () => {
      renderFlyout({
        ...editProps(indicesProfile),
        matches: [{ name: 'products' }, { name: 'users' }, { name: 'orders' }],
        storageSizeInBytes: 20 * GIB,
      });

      expect(getField('searchBoostAppliesToCount')).toHaveTextContent('3 indices');
      expect(getField('searchBoostAppliesToSize')).toHaveTextContent('20 GB');
      expect(screen.queryByTestId('searchBoostTimeline')).not.toBeInTheDocument();
    });

    it('updates the timeline as the max ages change', async () => {
      renderFlyout({
        ...editProps(dataStreamsProfile),
        matches: [{ name: 'clicks-web' }],
        storageSizeInBytes: GIB,
      });

      expect(getField('searchBoostTimeline-period-recent')).toBeInTheDocument();

      await fill('searchBoostProfileFlyoutMaxAge-recent', '0');

      expect(screen.queryByTestId('searchBoostTimeline-period-recent')).not.toBeInTheDocument();
      expect(getField('searchBoostTimeline-period-standard')).toBeInTheDocument();

      await fill('searchBoostProfileFlyoutMaxAge-recent', '');

      expect(getField('searchBoostTimeline-period-recent')).toBeInTheDocument();
    });

    it('disables the fields while saving', () => {
      renderFlyout({ ...editProps(dataStreamsProfile), isSaving: true });

      expect(getField('searchBoostProfileFlyoutMaxAge-recent')).toBeDisabled();
      expect(getField('searchBoostProfileFlyoutMaxAgeUnit-recent')).toBeDisabled();
      expect(getField('searchBoostProfileFlyoutMinBoost-background')).toBeDisabled();
      expect(
        within(getField('searchBoostProfileFlyoutSave-saveChanges')).getByRole('progressbar')
      ).toBeInTheDocument();
    });
  });

  describe('in another flyout', () => {
    it('goes back from the back button', async () => {
      const onBack = jest.fn();
      const props: ProfileFlyoutContentProps = {
        ...defaultProps,
        title: 'Create boost profile for new rule',
        titleId: 'ruleFlyoutTitle',
        onBack,
      };
      render(<ProfileFlyoutContent {...props} />);

      expect(
        screen.getByRole('heading', { name: 'Create boost profile for new rule' })
      ).toHaveAttribute('id', 'ruleFlyoutTitle');

      await userEvent.click(getField('searchBoostProfileFlyoutBack'));

      expect(onBack).toHaveBeenCalled();
    });
  });
});
