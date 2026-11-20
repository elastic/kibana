/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
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
  EuiFormFieldset,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';

import {
  DEFAULT_MANAGED_PROFILE_NAMES,
  MANAGED_PROFILE_NAMES,
} from '../../../common/managed_profiles';
import type { BoostProfile, BoostProfileType, BoostRuleMatch } from '../../../common/types';
import {
  CANCEL_BUTTON_LABEL,
  SAVE_CHANGES_BUTTON_LABEL,
  getManagedProfileMessage,
} from '../../translations';
import { AppliesToFooter } from '../applies_to_footer/applies_to_footer';
import {
  BOOST_PROFILE_LABEL,
  CREATE_PROFILE_LINK,
  CUSTOM_PROFILE_OPTION_DESCRIPTION,
  CUSTOM_PROFILE_OPTION_LABEL,
  DEFAULT_PROFILE_BADGE,
  NO_CUSTOM_PROFILES_PLACEHOLDER,
  NO_CUSTOM_PROFILES_TOOLTIPS,
  SELECT_PROFILE_PLACEHOLDER,
  SUBTITLES,
  TITLES,
} from './translations';

export interface ProjectDefaultFlyoutProps {
  type: BoostProfileType;
  /** Name of the default rule that saving updates. */
  ruleName: string;
  /** Available profiles. Only those of `type` are offered in the flyout. */
  profiles: readonly BoostProfile[];
  /** Profile the default rule uses now, checked when the flyout opens. */
  selectedProfileName: string;
  /** What the default rule applies to. */
  matches?: readonly BoostRuleMatch[];
  /** The storage size of the default rule. */
  storageSizeInBytes?: number;
  onCreateProfile: () => void;
  onSave: (profileName: string) => void;
  onClose: () => void;
}

interface Selection {
  option: 'managed' | 'custom';
  managedProfileName?: string;
  /** Kept while a managed profile is checked, so checking the custom option again restores it. */
  customProfileName?: string;
}

const getManagedOrder = (type: BoostProfileType, profileName: string): number => {
  const index = MANAGED_PROFILE_NAMES[type].findIndex((name) => name === profileName);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

export const ProjectDefaultFlyout = ({
  type,
  ruleName,
  profiles,
  selectedProfileName,
  matches,
  storageSizeInBytes,
  onCreateProfile,
  onSave,
  onClose,
}: ProjectDefaultFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'searchBoostProjectDefaultFlyoutTitle' });
  const radioName = useGeneratedHtmlId({ prefix: 'searchBoostProjectDefaultProfile' });

  const { managedProfiles, customProfiles } = useMemo(() => {
    const profilesOfType = profiles.filter((profile) => profile.type === type);
    return {
      managedProfiles: profilesOfType
        .filter(({ is_builtin: isBuiltin }) => isBuiltin)
        .sort((a, b) => getManagedOrder(type, a.name) - getManagedOrder(type, b.name)),
      customProfiles: profilesOfType.filter(({ is_builtin: isBuiltin }) => !isBuiltin),
    };
  }, [profiles, type]);

  const [selection, setSelection] = useState<Selection>(() =>
    customProfiles.some(({ name }) => name === selectedProfileName)
      ? { option: 'custom', customProfileName: selectedProfileName }
      : { option: 'managed', managedProfileName: selectedProfileName }
  );

  const { option, managedProfileName, customProfileName } = selection;
  const isCustomChecked = option === 'custom';
  const selectedName = isCustomChecked ? customProfileName : managedProfileName;
  const selectedProfile = profiles.find(({ name }) => name === selectedName);
  const isSelectionOffered = (isCustomChecked ? customProfiles : managedProfiles).some(
    ({ name }) => name === selectedName
  );
  const hasCustomProfiles = customProfiles.length > 0;

  const customProfileSelect = (
    <EuiSuperSelect
      fullWidth
      compressed
      aria-label={BOOST_PROFILE_LABEL}
      options={customProfiles.map(({ name }) => ({ value: name, inputDisplay: name }))}
      valueOfSelected={customProfileName}
      placeholder={hasCustomProfiles ? SELECT_PROFILE_PLACEHOLDER : NO_CUSTOM_PROFILES_PLACEHOLDER}
      disabled={!isCustomChecked || !hasCustomProfiles}
      onChange={(profileName) =>
        setSelection((current) => ({
          ...current,
          option: 'custom',
          customProfileName: profileName,
        }))
      }
      data-test-subj="searchBoostProjectDefaultCustomSelect"
    />
  );

  return (
    <EuiFlyout
      size="m"
      aria-labelledby={titleId}
      onClose={onClose}
      data-test-subj={`searchBoostProjectDefaultFlyout-${type}`}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>{TITLES[type]}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          <p>{SUBTITLES[type](ruleName)}</p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFormFieldset legend={{ children: BOOST_PROFILE_LABEL, display: 'hidden' }}>
          <EuiFlexGroup direction="column" gutterSize="m">
            {managedProfiles.map(({ name }) => {
              const message = getManagedProfileMessage(name);
              return (
                <EuiFlexItem key={name} grow={false}>
                  <EuiCheckableCard
                    id={`${radioName}-${name}`}
                    name={radioName}
                    value={name}
                    checked={!isCustomChecked && managedProfileName === name}
                    onChange={() =>
                      setSelection((current) => ({
                        ...current,
                        option: 'managed',
                        managedProfileName: name,
                      }))
                    }
                    label={
                      <>
                        <EuiFlexGroup
                          component="span"
                          gutterSize="s"
                          alignItems="center"
                          responsive={false}
                        >
                          <EuiFlexItem component="span" grow={false}>
                            <strong>{message?.label ?? name}</strong>
                          </EuiFlexItem>
                          {name === DEFAULT_MANAGED_PROFILE_NAMES[type] ? (
                            <EuiFlexItem component="span" grow={false}>
                              <EuiBadge data-test-subj="searchBoostProjectDefaultBadge">
                                {DEFAULT_PROFILE_BADGE}
                              </EuiBadge>
                            </EuiFlexItem>
                          ) : null}
                        </EuiFlexGroup>
                        {message ? (
                          <>
                            <EuiSpacer size="xs" />
                            <EuiText size="xs">{message.description}</EuiText>
                          </>
                        ) : null}
                      </>
                    }
                    data-test-subj={`searchBoostProjectDefaultOption-${name}`}
                  />
                </EuiFlexItem>
              );
            })}
            <EuiFlexItem grow={false}>
              <EuiCheckableCard
                id={`${radioName}-custom`}
                name={radioName}
                value="custom"
                checked={isCustomChecked}
                onChange={() => setSelection((current) => ({ ...current, option: 'custom' }))}
                label={<strong>{CUSTOM_PROFILE_OPTION_LABEL}</strong>}
                data-test-subj="searchBoostProjectDefaultOption-custom"
              >
                <EuiText size="xs">
                  <p>{CUSTOM_PROFILE_OPTION_DESCRIPTION}</p>
                </EuiText>
                <EuiSpacer size="s" />
                <EuiFormRow
                  fullWidth
                  display="rowCompressed"
                  label={BOOST_PROFILE_LABEL}
                  isDisabled={!isCustomChecked}
                  labelAppend={
                    <EuiText size="xs">
                      <EuiLink
                        onClick={onCreateProfile}
                        data-test-subj="searchBoostProjectDefaultCreateProfile"
                      >
                        {CREATE_PROFILE_LINK}
                      </EuiLink>
                    </EuiText>
                  }
                >
                  {hasCustomProfiles ? (
                    customProfileSelect
                  ) : (
                    <EuiToolTip
                      content={NO_CUSTOM_PROFILES_TOOLTIPS[type]}
                      display="block"
                      anchorProps={{ 'data-test-subj': 'searchBoostProjectDefaultNoCustomTooltip' }}
                    >
                      {/* The select is disabled, so this wrapper takes focus to show the tooltip. */}
                      <div tabIndex={0} data-test-subj="searchBoostProjectDefaultNoCustomTrigger">
                        {customProfileSelect}
                      </div>
                    </EuiToolTip>
                  )}
                </EuiFormRow>
              </EuiCheckableCard>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormFieldset>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        {matches && storageSizeInBytes !== undefined ? (
          <>
            <AppliesToFooter
              type={type}
              matches={matches}
              storageSizeInBytes={storageSizeInBytes}
              profile={selectedProfile}
            />
            <EuiHorizontalRule margin="m" />
          </>
        ) : null}
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              onClick={onClose}
              data-test-subj="searchBoostProjectDefaultCancel"
            >
              {CANCEL_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isDisabled={!isSelectionOffered}
              onClick={() => {
                if (selectedName && isSelectionOffered) onSave(selectedName);
              }}
              data-test-subj="searchBoostProjectDefaultSave"
            >
              {SAVE_CHANGES_BUTTON_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
