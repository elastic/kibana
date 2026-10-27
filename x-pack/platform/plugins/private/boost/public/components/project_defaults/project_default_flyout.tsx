/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiLink,
  EuiScreenReaderOnly,
  EuiSelect,
  EuiText,
  EuiTextColor,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DEFAULT_PROFILE_KEYS, DEFAULT_RULE_NAMES } from '../../../common/presets';
import type { BoostProfileInput, BoostProfileType, BoostRule } from '../../../common/types';
import { estimateRuleCost } from '../../../common/vcu_estimate';
import { useBoostServices } from '../../hooks/use_boost_services';
import { useBoostState, useUpdateDefaultRule } from '../../hooks/use_boost_state';
import { PROVISIONING_NOTE } from '../../translations';
import { CardLabel } from '../card_label';
import { CostEstimate } from '../cost_estimate';
import { FLYOUT_WIDTH } from '../flyout_width';
import { DEFAULT_PRESET_OPTIONS } from '../preset_options';
import { CREATE_PROFILE_TITLE, ProfileFlyoutContent } from '../profiles/profile_flyout';
import { FlyoutOnTop, getFlyoutHistoryProps } from '../flyout_history';

// Stands in for a profile being created in the profile form, so its cost can be estimated.
const NEW_PROFILE_NAME = '<new profile>';

const TITLES: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.boost.projectDefaultForm.indicesTitle', {
    defaultMessage: 'Edit project default for indices',
  }),
  data_streams: i18n.translate('xpack.boost.projectDefaultForm.dataStreamsTitle', {
    defaultMessage: 'Edit project default for data streams',
  }),
};

const DEFAULT_BADGE_LABEL = i18n.translate('xpack.boost.projectDefaultForm.defaultBadge', {
  defaultMessage: 'Default',
});

interface ProjectDefaultFlyoutProps {
  type: BoostProfileType;
  /**
   * The flyout history it opens in, on top of the flyout that opened it, such as Index Management's
   * details, which its Back button returns to. The profile form then opens on top of it in turn.
   */
  historyKey?: symbol;
  onClose: () => void;
}

/**
 * Edits a project default: an Elastic-managed preset, or a custom profile of the same type, which
 * can be created here. Its footer estimates the default rule's cost with the choice.
 */
export const ProjectDefaultFlyout = ({ type, historyKey, onClose }: ProjectDefaultFlyoutProps) => {
  const { notifications } = useBoostServices();
  const { data: state } = useBoostState();
  const titleId = useGeneratedHtmlId();
  const profileTitleId = useGeneratedHtmlId();
  const groupName = useGeneratedHtmlId({ prefix: 'projectDefault' });
  const savedProfileName = state?.settings.default_profiles[DEFAULT_PROFILE_KEYS[type]] ?? '';
  const presets = DEFAULT_PRESET_OPTIONS[type];
  const [profileName, setProfileName] = useState(savedProfileName);
  // The custom profile last chosen, kept while a preset is selected, so choosing custom again
  // restores it.
  const [customProfileName, setCustomProfileName] = useState(() =>
    presets.some((preset) => preset.profileName === savedProfileName) ? '' : savedProfileName
  );
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const { mutate: updateDefaultRule, isLoading: isSaving } = useUpdateDefaultRule();
  const { euiTheme } = useEuiTheme();

  if (!state) {
    return null;
  }

  const { profiles, rules, data_sources: dataSources } = state;
  const ruleName = DEFAULT_RULE_NAMES[type];
  const savedRule = rules.find(({ name }) => name === ruleName);
  const customProfiles = profiles
    .filter((profile) => !profile.is_builtin && profile.type === type)
    .sort((a, b) => a.name.localeCompare(b.name));
  const isCustom = !presets.some((preset) => preset.profileName === profileName);
  const firstCustomProfile = customProfileName || (customProfiles[0]?.name ?? '');
  // Nothing to choose until there's a custom profile of this type.
  const isCustomCardDisabled = isSaving || customProfiles.length === 0;
  // The profile selector is usable once the custom card is chosen.
  const isProfileSelectDisabled = isSaving || !isCustom;
  const noCustomProfilesReason =
    customProfiles.length > 0
      ? undefined
      : type === 'indices'
      ? i18n.translate('xpack.boost.projectDefaultForm.noIndicesProfiles', {
          defaultMessage: 'Create an indices boost profile to use one here.',
        })
      : i18n.translate('xpack.boost.projectDefaultForm.noDataStreamsProfiles', {
          defaultMessage: 'Create a data streams boost profile to use one here.',
        });

  const chooseCustom = (name: string) => {
    setCustomProfileName(name);
    setProfileName(name);
  };

  // The default rule's cost with a profile, compared with its saved profile.
  const estimate = (nextProfileName: string, nextProfiles = profiles) => {
    if (!savedRule) {
      return undefined;
    }
    const nextRule: BoostRule = { ...savedRule, boost_profile: nextProfileName };
    return estimateRuleCost({
      dataSources,
      rules,
      profiles: nextProfiles,
      nextRule,
      replacedRuleName: ruleName,
      comparedRule: savedRule,
    });
  };

  const onSave = () =>
    updateDefaultRule(
      { type, profileName },
      {
        onSuccess: () => {
          notifications.toasts.addSuccess({
            title:
              type === 'indices'
                ? i18n.translate('xpack.boost.projectDefaultForm.indicesSavedToast', {
                    defaultMessage: 'Saved the project default for indices',
                  })
                : i18n.translate('xpack.boost.projectDefaultForm.dataStreamsSavedToast', {
                    defaultMessage: 'Saved the project default for data streams',
                  }),
            text: PROVISIONING_NOTE,
          });
          onClose();
        },
      }
    );

  // On its own, both views share one flyout, so creating a profile doesn't open another.
  const flyoutProps = {
    onClose,
    size: FLYOUT_WIDTH,
    paddingSize: 'm',
    'aria-labelledby': titleId,
    ownFocus: true,
    'data-test-subj': 'boostProjectDefaultFlyout',
    ...getFlyoutHistoryProps(historyKey, TITLES[type]),
  } as const;

  const renderProfileForm = (formTitleId: string) => (
    <ProfileFlyoutContent
      forRule={{
        type,
        isProjectDefault: true,
        estimate: (profile: BoostProfileInput) =>
          estimate(NEW_PROFILE_NAME, [
            ...profiles,
            { ...profile, name: NEW_PROFILE_NAME, is_builtin: false },
          ]),
        onCreate: (name) => {
          chooseCustom(name);
          setIsCreatingProfile(false);
        },
      }}
      takenNames={profiles.map(({ name }) => name)}
      titleId={formTitleId}
      onClose={() => setIsCreatingProfile(false)}
    />
  );

  if (isCreatingProfile && !historyKey) {
    return (
      <EuiFlyout
        {...flyoutProps}
        flyoutMenuProps={{
          showBackButton: true,
          backButtonProps: { onClick: () => setIsCreatingProfile(false) },
        }}
      >
        {renderProfileForm(titleId)}
      </EuiFlyout>
    );
  }

  const defaultFlyout = (
    <EuiFlyout {...flyoutProps}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>{TITLES[type]}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <fieldset
          aria-label={i18n.translate('xpack.boost.projectDefaultForm.profileLabel', {
            defaultMessage: 'Boost profile',
          })}
        >
          <EuiFlexGroup direction="column" gutterSize="s">
            {presets.map(({ profileName: presetProfileName, label, description, isDefault }) => (
              <EuiFlexItem key={presetProfileName}>
                <EuiCheckableCard
                  id={`${groupName}-${presetProfileName}`}
                  name={groupName}
                  label={
                    <CardLabel
                      title={label}
                      description={description}
                      badge={isDefault ? <EuiBadge>{DEFAULT_BADGE_LABEL}</EuiBadge> : undefined}
                      isDisabled={isSaving}
                    />
                  }
                  checked={profileName === presetProfileName}
                  onChange={() => setProfileName(presetProfileName)}
                  disabled={isSaving}
                  data-test-subj={`boostProjectDefaultPreset-${presetProfileName}`}
                />
              </EuiFlexItem>
            ))}
            <EuiFlexItem>
              {/* Until there's a custom profile of this type, the card is disabled, and a tooltip
                  says why, on hover or when its "Create profile" link has focus. Screen readers
                  read the reason with the description. */}
              <EuiToolTip content={noCustomProfilesReason} display="block">
                <EuiCheckableCard
                  id={`${groupName}-custom`}
                  name={groupName}
                  label={
                    <CardLabel
                      title={i18n.translate('xpack.boost.projectDefaultForm.customLabel', {
                        defaultMessage: 'Custom boost profile',
                      })}
                      description={
                        <>
                          {i18n.translate('xpack.boost.projectDefaultForm.customDescription', {
                            defaultMessage: 'Use one of your own boost profiles.',
                          })}
                          {noCustomProfilesReason && (
                            <EuiScreenReaderOnly>
                              <span> {noCustomProfilesReason}</span>
                            </EuiScreenReaderOnly>
                          )}
                        </>
                      }
                      isDisabled={isCustomCardDisabled}
                    />
                  }
                  checked={isCustom}
                  onChange={() => chooseCustom(firstCustomProfile)}
                  disabled={isCustomCardDisabled}
                  data-test-subj="boostProjectDefaultCustom"
                >
                  {/* The card's body, outside its radio's label, so it can hold controls. Creating a
                      profile stays usable while the card is disabled, since it's what enables it. */}
                  <EuiFormRow
                    display="rowCompressed"
                    label={
                      // EUI's form label doesn't dim when disabled, so it takes the color the card
                      // dims its own title to.
                      <EuiTextColor
                        color={isProfileSelectDisabled ? euiTheme.colors.disabledText : 'inherit'}
                      >
                        {i18n.translate('xpack.boost.projectDefaultForm.customProfileLabel', {
                          defaultMessage: 'Boost profile',
                        })}
                      </EuiTextColor>
                    }
                    isDisabled={isProfileSelectDisabled}
                    labelAppend={
                      <EuiText size="xs">
                        <EuiLink
                          onClick={() => setIsCreatingProfile(true)}
                          disabled={isSaving}
                          data-test-subj="boostProjectDefaultCreateProfile"
                        >
                          {i18n.translate('xpack.boost.projectDefaultForm.createProfile', {
                            defaultMessage: 'Create profile',
                          })}
                        </EuiLink>
                      </EuiText>
                    }
                    fullWidth
                  >
                    <EuiSelect
                      compressed
                      fullWidth
                      // A placeholder, until a profile is chosen, or when there's none to choose.
                      options={[
                        {
                          value: '',
                          text:
                            customProfiles.length > 0
                              ? i18n.translate('xpack.boost.projectDefaultForm.selectProfile', {
                                  defaultMessage: 'Select a profile',
                                })
                              : i18n.translate('xpack.boost.projectDefaultForm.noProfiles', {
                                  defaultMessage: 'No custom profiles yet',
                                }),
                          disabled: true,
                        },
                        ...customProfiles.map(({ name }) => ({ value: name, text: name })),
                      ]}
                      // While a preset is chosen, the custom profile last chosen stays, disabled.
                      value={isCustom ? profileName : customProfileName}
                      onChange={({ target: { value } }) => chooseCustom(value)}
                      data-test-subj="boostProjectDefaultCustomProfile"
                    />
                  </EuiFormRow>
                </EuiCheckableCard>
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </fieldset>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <CostEstimate impact={estimate(profileName)} type={type} isEditing={false} showChange />
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              onClick={onClose}
              flush="left"
              data-test-subj="boostProjectDefaultCancel"
            >
              {i18n.translate('xpack.boost.projectDefaultForm.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              fill
              onClick={onSave}
              isLoading={isSaving}
              data-test-subj="boostProjectDefaultSave"
            >
              {i18n.translate('xpack.boost.projectDefaultForm.saveButton', {
                defaultMessage: 'Save changes',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );

  // In a history, the profile form opens on top of the default, which stays open behind it.
  return historyKey ? (
    <>
      {defaultFlyout}
      {isCreatingProfile && (
        <FlyoutOnTop
          historyKey={historyKey}
          title={CREATE_PROFILE_TITLE}
          onClose={() => setIsCreatingProfile(false)}
          size={FLYOUT_WIDTH}
          aria-labelledby={profileTitleId}
          data-test-subj="boostProjectDefaultProfileFlyout"
        >
          {renderProfileForm(profileTitleId)}
        </FlyoutOnTop>
      )}
    </>
  ) : (
    defaultFlyout
  );
};
