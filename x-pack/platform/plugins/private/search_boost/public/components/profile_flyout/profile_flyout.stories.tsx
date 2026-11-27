/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiFlyout, useGeneratedHtmlId } from '@elastic/eui';

import type { BoostLimits } from '../../../common/profile_validation';
import type {
  BoostRuleMatch,
  DataStreamsBoostProfile,
  IndicesBoostProfile,
} from '../../../common/types';
import { SAVE_CHANGES_BUTTON_LABEL } from '../../translations';
import { FLYOUT_PADDING_SIZE } from './form_layout';
import type { ProfileFlyoutProps, ProfileSaveButton } from './profile_flyout';
import { ProfileFlyout, ProfileFlyoutContent } from './profile_flyout';
import {
  CREATE_FOR_DEFAULT_TITLES,
  CREATE_TITLE,
  SAVE_AND_CREATE_RULE_BUTTON_LABEL,
  SAVE_AND_USE_AS_DEFAULT_BUTTON_LABEL,
  SAVE_AND_USE_IN_RULE_BUTTON_LABEL,
  SAVE_BUTTON_LABEL,
  getCreateForRuleTitle,
  getEditTitle,
} from './translations';

const GIB = 1024 ** 3;

const BOOST_LIMITS: Readonly<BoostLimits> = { minBoost: 1, maxBoost: 19 };

const INDICES_PROFILE: IndicesBoostProfile = {
  name: 'storefront-search',
  is_builtin: false,
  type: 'indices',
  min_boost: 3,
  max_boost: 15,
  availability: 'one_extra_copy',
  prewarm: true,
  pinned: false,
};

const DATA_STREAMS_PROFILE: DataStreamsBoostProfile = {
  name: 'clickstream-recent',
  is_builtin: false,
  type: 'data_streams',
  recent: { min_boost: 2, max_boost: 19, max_age: '12h' },
  standard: { min_boost: 1, max_boost: 10, max_age: '3d' },
  background: { min_boost: 1, max_boost: 2 },
};

const match = (name: string): BoostRuleMatch => ({ name });

const INDICES_MATCHES: readonly BoostRuleMatch[] = [
  match('products'),
  match('catalog-2026-fall'),
  match('catalog-2026-spring'),
];

const DATA_STREAMS_MATCHES: readonly BoostRuleMatch[] = [
  match('clicks-mobile'),
  match('clicks-web'),
  match('logs-nginx-default'),
];

const saveButton = (id: string, label: string): ProfileSaveButton => ({
  id,
  label,
  onSave: action(`onSave (${id})`),
});

const CREATE_BUTTONS: readonly ProfileSaveButton[] = [
  saveButton('save', SAVE_BUTTON_LABEL),
  saveButton('saveAndCreateRule', SAVE_AND_CREATE_RULE_BUTTON_LABEL),
];

const SAVE_AND_USE_IN_RULE_BUTTONS = [saveButton('saveAndUse', SAVE_AND_USE_IN_RULE_BUTTON_LABEL)];

const SAVE_AND_USE_AS_DEFAULT_BUTTONS = [
  saveButton('saveAndUse', SAVE_AND_USE_AS_DEFAULT_BUTTON_LABEL),
];

const EDIT_BUTTONS = [saveButton('saveChanges', SAVE_CHANGES_BUTTON_LABEL)];

/** The profile form in place of the rule flyout's, with a back button to the rule. */
const InRuleFlyout = (args: ProfileFlyoutProps) => {
  const { onClose } = args;
  const titleId = useGeneratedHtmlId({ prefix: 'searchBoostRuleFlyoutTitle' });
  return (
    <EuiFlyout
      size="m"
      paddingSize={FLYOUT_PADDING_SIZE}
      aria-labelledby={titleId}
      onClose={onClose}
    >
      <ProfileFlyoutContent {...args} titleId={titleId} onBack={action('onBack')} />
    </EuiFlyout>
  );
};

const meta: Meta<ProfileFlyoutProps> = {
  title: 'Search boost/Flyouts/Boost profile',
  component: ProfileFlyout,
  // Remount when the props the form starts from change.
  render: (args) => (
    <ProfileFlyout
      key={JSON.stringify([args.profile?.name, args.type, args.isTypeFixed, args.limits])}
      {...args}
    />
  ),
  args: {
    title: CREATE_TITLE,
    limits: BOOST_LIMITS,
    docsUrl: 'https://www.elastic.co/docs',
    saveButtons: CREATE_BUTTONS,
    isSaving: false,
    isNameTaken: false,
    onClose: action('onClose'),
  },
  argTypes: {
    profile: { table: { disable: true } },
    matches: { table: { disable: true } },
    saveButtons: { table: { disable: true } },
    onClose: { table: { disable: true } },
  },
};

export default meta;

type Story = StoryObj<ProfileFlyoutProps>;

export const Create: Story = {};

export const CreateWithRatioLimit: Story = {
  args: { limits: { ...BOOST_LIMITS, maxRatio: 4 } },
};

/** From the rule flyout's "Create profile" link, with the type of the rule's selected profile. */
export const CreateForNewRule: Story = {
  render: (args) => <InRuleFlyout {...args} />,
  args: {
    title: getCreateForRuleTitle(),
    type: 'data_streams',
    saveButtons: SAVE_AND_USE_IN_RULE_BUTTONS,
  },
};

/** From the rule flyout of a rule whose type can't change. */
export const CreateForLockedRule: Story = {
  render: (args) => <InRuleFlyout {...args} />,
  args: {
    title: getCreateForRuleTitle('storefront-archive'),
    type: 'indices',
    isTypeFixed: true,
    saveButtons: SAVE_AND_USE_IN_RULE_BUTTONS,
  },
};

/** The title names the type, so it isn't shown again under it. */
export const CreateForIndicesDefault: Story = {
  args: {
    title: CREATE_FOR_DEFAULT_TITLES.indices,
    type: 'indices',
    isTypeFixed: true,
    isTypeInTitle: true,
    saveButtons: SAVE_AND_USE_AS_DEFAULT_BUTTONS,
    matches: INDICES_MATCHES,
    storageSizeInBytes: 2.1 * GIB,
  },
};

/** Change an "Until data age" to see the timeline follow. */
export const CreateForDataStreamsDefault: Story = {
  args: {
    title: CREATE_FOR_DEFAULT_TITLES.data_streams,
    type: 'data_streams',
    isTypeFixed: true,
    isTypeInTitle: true,
    saveButtons: SAVE_AND_USE_AS_DEFAULT_BUTTONS,
    matches: DATA_STREAMS_MATCHES,
    storageSizeInBytes: 310.1 * GIB,
  },
};

export const EditIndices: Story = {
  args: {
    title: getEditTitle(INDICES_PROFILE.name),
    profile: INDICES_PROFILE,
    saveButtons: EDIT_BUTTONS,
    matches: INDICES_MATCHES,
    storageSizeInBytes: 20 * GIB,
  },
};

export const EditDataStreams: Story = {
  args: {
    title: getEditTitle(DATA_STREAMS_PROFILE.name),
    profile: DATA_STREAMS_PROFILE,
    saveButtons: EDIT_BUTTONS,
    matches: DATA_STREAMS_MATCHES,
    storageSizeInBytes: 231 * GIB,
  },
};

export const Saving: Story = {
  args: { ...EditIndices.args, isSaving: true },
};
