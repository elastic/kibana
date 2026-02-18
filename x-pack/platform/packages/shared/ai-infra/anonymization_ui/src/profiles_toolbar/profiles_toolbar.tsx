/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TARGET_TYPE_FILTER_OPTIONS } from '../profiles/components/constants';
import type { TargetType } from '../profiles/types';

interface ProfilesToolbarProps {
  modeLabel: string;
  isManageMode: boolean;
  activeSpaceId: string;
  targetType: '' | TargetType;
  targetIdFilter: string;
  onTargetTypeChange: (value: '' | TargetType) => void;
  onTargetIdFilterChange: (value: string) => void;
  onCreateProfile: () => void;
}

export const ProfilesToolbar = ({
  modeLabel,
  isManageMode,
  activeSpaceId,
  targetType,
  targetIdFilter,
  onTargetTypeChange,
  onTargetIdFilterChange,
  onCreateProfile,
}: ProfilesToolbarProps) => {
  const onTargetTypeFilterSelectChange = (value: string) => {
    const selectedOption = TARGET_TYPE_FILTER_OPTIONS.find((option) => option.value === value);
    onTargetTypeChange(selectedOption?.value ?? '');
  };

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color={isManageMode ? 'success' : 'hollow'}>{modeLabel}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" data-test-subj="anonymizationProfilesActiveSpaceId">
            <p>
              {i18n.translate('anonymizationUi.profiles.toolbar.activeSpace', {
                defaultMessage: 'Space: {spaceId}',
                values: { spaceId: activeSpaceId },
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            onClick={onCreateProfile}
            isDisabled={!isManageMode}
            data-test-subj="anonymizationProfilesCreateProfile"
          >
            {i18n.translate('anonymizationUi.profiles.toolbar.createProfile', {
              defaultMessage: 'Create profile',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiCallOut
        color="primary"
        iconType="info"
        title={i18n.translate('anonymizationUi.profiles.toolbar.integrationScopeTitle', {
          defaultMessage: 'Integration scope contract',
        })}
      >
        <p>
          {i18n.translate('anonymizationUi.profiles.toolbar.integrationScopeDescription', {
            defaultMessage:
              'Replacements are resolved by reference (id or thread/execution scope) through inference-owned APIs. Profiles remain the policy source of truth.',
          })}
        </p>
      </EuiCallOut>

      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" responsive>
        <EuiFlexItem>
          <EuiFieldText
            fullWidth
            aria-label={i18n.translate('anonymizationUi.profiles.toolbar.targetIdAriaLabel', {
              defaultMessage: 'Filter anonymization profiles by target id',
            })}
            placeholder={i18n.translate('anonymizationUi.profiles.toolbar.targetIdPlaceholder', {
              defaultMessage: 'Filter by target id',
            })}
            value={targetIdFilter}
            onChange={(event) => onTargetIdFilterChange(event.target.value)}
            data-test-subj="anonymizationProfilesTargetIdFilter"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSelect
            aria-label={i18n.translate('anonymizationUi.profiles.toolbar.targetTypeAriaLabel', {
              defaultMessage: 'Filter anonymization profiles by target type',
            })}
            value={targetType}
            options={TARGET_TYPE_FILTER_OPTIONS}
            onChange={(event) => onTargetTypeFilterSelectChange(event.target.value)}
            data-test-subj="anonymizationProfilesTargetTypeFilter"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
