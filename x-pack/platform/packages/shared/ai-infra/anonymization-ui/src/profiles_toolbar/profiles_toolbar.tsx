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
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  TARGET_TYPE_DATA_VIEW,
  TARGET_TYPE_INDEX,
  TARGET_TYPE_INDEX_PATTERN,
  type TargetType,
} from '../common/target_types';

const TARGET_TYPE_FILTER_OPTIONS: Array<{ value: '' | TargetType; text: string }> = [
  {
    value: '',
    text: i18n.translate('anonymizationUi.profiles.targetTypeFilter.any', {
      defaultMessage: 'Any target type',
    }),
  },
  {
    value: TARGET_TYPE_INDEX,
    text: i18n.translate('anonymizationUi.profiles.targetTypeOption.index', {
      defaultMessage: 'index',
    }),
  },
  {
    value: TARGET_TYPE_INDEX_PATTERN,
    text: i18n.translate('anonymizationUi.profiles.targetTypeOption.indexPattern', {
      defaultMessage: 'index_pattern',
    }),
  },
  {
    value: TARGET_TYPE_DATA_VIEW,
    text: i18n.translate('anonymizationUi.profiles.targetTypeOption.dataView', {
      defaultMessage: 'data_view',
    }),
  },
];

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

      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" responsive>
        <EuiFlexItem>
          <EuiFieldText
            fullWidth
            aria-label={i18n.translate('anonymizationUi.profiles.toolbar.targetIdAriaLabel', {
              defaultMessage: 'Filter anonymization profiles by name or target id',
            })}
            placeholder={i18n.translate('anonymizationUi.profiles.toolbar.targetIdPlaceholder', {
              defaultMessage: 'Filter by name or target id',
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
