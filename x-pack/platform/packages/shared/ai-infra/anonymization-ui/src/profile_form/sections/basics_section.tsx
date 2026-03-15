/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiComboBox,
  EuiFieldText,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TARGET_TYPE_DATA_VIEW } from '../../common/target_types';
import { TARGET_TYPE_OPTIONS } from '../constants';
import { useProfileFormContext } from '../profile_form_context';

export const ProfileBasicsSection = () => {
  const {
    name,
    description,
    targetType,
    nameError,
    targetIdError,
    isEdit,
    isManageMode,
    isSubmitting,
    onNameChange,
    onDescriptionChange,
    onTargetTypeChange,
    targetIdField,
    includeHiddenAndSystemIndices,
    onIncludeHiddenAndSystemIndicesChange,
  } = useProfileFormContext();
  const [isAdvancedSettingsVisible, setIsAdvancedSettingsVisible] = useState(false);

  const onTargetTypeSelectChange = (value: string) => {
    const selectedOption = TARGET_TYPE_OPTIONS.find((option) => option.value === value);
    if (selectedOption) {
      onTargetTypeChange(selectedOption.value);
    }
  };

  const onAdvancedSettingsToggle = useCallback(() => {
    setIsAdvancedSettingsVisible((isVisible) => !isVisible);
  }, []);

  return (
    <EuiFlexGrid columns={2} gutterSize="m" responsive={false}>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('anonymizationUi.profiles.basics.nameLabel', {
            defaultMessage: 'Name',
          })}
          isInvalid={Boolean(nameError)}
          error={nameError}
          fullWidth
        >
          <EuiFieldText
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            isInvalid={Boolean(nameError)}
            disabled={!isManageMode || isSubmitting}
            data-test-subj="anonymizationProfilesFormName"
            fullWidth
            placeholder={i18n.translate('anonymizationUi.profiles.basics.namePlaceholder', {
              defaultMessage: 'Enter profile name',
            })}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('anonymizationUi.profiles.basics.targetTypeLabel', {
            defaultMessage: 'Target type',
          })}
          fullWidth
        >
          <EuiSelect
            aria-label={i18n.translate('anonymizationUi.profiles.basics.targetTypeAriaLabel', {
              defaultMessage: 'Select profile target type',
            })}
            value={targetType}
            options={TARGET_TYPE_OPTIONS}
            onChange={(event) => onTargetTypeSelectChange(event.target.value)}
            disabled={!isManageMode || isEdit || isSubmitting}
            data-test-subj="anonymizationProfilesFormTargetType"
            fullWidth
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('anonymizationUi.profiles.basics.descriptionLabel', {
            defaultMessage: 'Description',
          })}
          fullWidth
        >
          <EuiFieldText
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            disabled={!isManageMode || isSubmitting}
            fullWidth
            placeholder={i18n.translate('anonymizationUi.profiles.basics.descriptionPlaceholder', {
              defaultMessage: 'Enter profile description',
            })}
            data-test-subj="anonymizationProfilesFormDescription"
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('anonymizationUi.profiles.basics.targetIdLabel', {
            defaultMessage: 'Target',
          })}
          helpText={targetIdField.targetIdHelpText}
          isInvalid={Boolean(targetIdError || targetIdField.targetIdAsyncError)}
          error={[targetIdError, targetIdField.targetIdAsyncError].filter(Boolean)}
          fullWidth
        >
          <EuiComboBox
            aria-label={i18n.translate('anonymizationUi.profiles.basics.targetIdAriaLabel', {
              defaultMessage: 'Select profile target',
            })}
            singleSelection={{ asPlainText: true }}
            options={targetIdField.targetIdOptions}
            selectedOptions={targetIdField.selectedTargetIdOptions}
            onSearchChange={targetIdField.onTargetIdSearchChange}
            onFocus={targetIdField.onTargetIdFocus}
            onChange={targetIdField.onTargetIdSelectChange}
            onCreateOption={targetIdField.onTargetIdCreateOption}
            isClearable={false}
            isLoading={targetIdField.isTargetIdLoading}
            isInvalid={Boolean(targetIdError || targetIdField.targetIdAsyncError)}
            isDisabled={!isManageMode || isEdit || isSubmitting}
            placeholder={
              targetType === TARGET_TYPE_DATA_VIEW
                ? i18n.translate('anonymizationUi.profiles.basics.targetIdPlaceholderDataView', {
                    defaultMessage: 'Select data view by id',
                  })
                : i18n.translate('anonymizationUi.profiles.basics.targetIdPlaceholderOther', {
                    defaultMessage: 'Type to search targets',
                  })
            }
            customOptionText={
              targetType === TARGET_TYPE_DATA_VIEW
                ? undefined
                : i18n.translate('anonymizationUi.profiles.basics.targetIdCustomOptionText', {
                    defaultMessage: 'Use custom target: "{searchValue}"',
                    values: { searchValue: '{searchValue}' },
                  })
            }
            data-test-subj="anonymizationProfilesFormTargetId"
            fullWidth
          />
        </EuiFormRow>
        <EuiSpacer size="s" />
        <EuiText size="xs">
          <EuiLink
            onClick={onAdvancedSettingsToggle}
            data-test-subj="anonymizationProfilesFormToggleAdvancedSettings"
          >
            {isAdvancedSettingsVisible
              ? i18n.translate('anonymizationUi.profiles.basics.advancedSettings.hideButtonLabel', {
                  defaultMessage: 'Hide advanced settings',
                })
              : i18n.translate('anonymizationUi.profiles.basics.advancedSettings.showButtonLabel', {
                  defaultMessage: 'Show advanced settings',
                })}
          </EuiLink>
        </EuiText>
        {isAdvancedSettingsVisible ? (
          <>
            <EuiSpacer size="s" />
            <EuiSwitch
              label={i18n.translate(
                'anonymizationUi.profiles.basics.advancedSettings.allowHiddenLabel',
                {
                  defaultMessage: 'Allow hidden and system indices',
                }
              )}
              checked={includeHiddenAndSystemIndices}
              onChange={(event) => onIncludeHiddenAndSystemIndicesChange(event.target.checked)}
              disabled={!isManageMode || isEdit || isSubmitting}
              data-test-subj="anonymizationProfilesFormAllowHiddenAndSystemIndices"
            />
          </>
        ) : null}
      </EuiFlexItem>
    </EuiFlexGrid>
  );
};
