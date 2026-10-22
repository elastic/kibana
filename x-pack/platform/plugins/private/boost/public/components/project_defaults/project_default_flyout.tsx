/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckableCard,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiToolTip,
  EuiScreenReaderOnly,
  EuiLink,
  EuiFormRow,
  EuiSelect,
  EuiText,
  EuiTitle,
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
import { ProfileFlyoutContent } from '../profiles/profile_flyout';

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
  onClose: () => void;
}

/**
 * Edits a project default: an Elastic-managed preset, or a custom profile of the same type, which
 * can be created here. Its footer estimates the default rule's cost with the choice.
 */
export const ProjectDefaultFlyout = ({ type, onClose }: ProjectDefaultFlyoutProps) => {
  const { notifications } = useBoostServices();
  const { data: state } = useBoostState();
  const titleId = useGeneratedHtmlId();
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

  // Both views share one flyout, so creating a profile doesn't open another.
  const flyoutProps = {
    onClose,
    size: FLYOUT_WIDTH,
    paddingSize: 'm',
    'aria-labelledby': titleId,
    ownFocus: true,
    'data-test-subj': 'boostProjectDefaultFlyout',
  } as const;

  if (isCreatingProfile) {
    return (
      <EuiFlyout
        {...flyoutProps}
        flyoutMenuProps={{
          showBackButton: true,
          backButtonProps: { onClick: () => setIsCreatingProfile(false) },
        }}
      >
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
          titleId={titleId}
          onClose={() => setIsCreatingProfile(false)}
        />
      </EuiFlyout>
    );
  }

  return (
    <EuiFlyout {...flyoutProps}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>{TITLES[type]}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFormRow
          labelType="legend"
          label={i18n.translate('xpack.boost.projectDefaultForm.profileLabel', {
            defaultMessage: 'Boost profile',
          })}
          // Here rather than in the custom card, whose title is its radio's label, which can't hold
          // a button, and which is disabled until there's a custom profile to choose.
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
                  says why. Screen readers read the reason with the description, since a disabled
                  card can't take the focus that shows the tooltip. */}
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
                    />
                  }
                  checked={isCustom}
                  onChange={() => chooseCustom(firstCustomProfile)}
                  // Nothing to choose until there's a custom profile of this type.
                  disabled={isSaving || customProfiles.length === 0}
                  data-test-subj="boostProjectDefaultCustom"
                >
                  {isCustom && (
                    <EuiSelect
                      compressed
                      fullWidth
                      aria-label={i18n.translate(
                        'xpack.boost.projectDefaultForm.customProfileLabel',
                        { defaultMessage: 'Custom boost profile' }
                      )}
                      options={customProfiles.map(({ name }) => ({ value: name, text: name }))}
                      value={profileName}
                      onChange={({ target: { value } }) => chooseCustom(value)}
                      disabled={isSaving}
                      data-test-subj="boostProjectDefaultCustomProfile"
                    />
                  )}
                </EuiCheckableCard>
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
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
};
