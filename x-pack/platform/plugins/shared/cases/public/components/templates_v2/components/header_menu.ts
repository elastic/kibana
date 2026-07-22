/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderBadge, AppHeaderMenu } from '@kbn/app-header';
import * as i18n from '../translations';
import * as fieldLibraryI18n from '../../field_library/translations';

interface GetTemplatesListMenuArgs {
  onImportClick: () => void;
  navigateToCasesCreateTemplate: () => void;
  getCasesCreateTemplateUrl: () => string;
  navigateToCasesFieldLibrary: () => void;
  getCasesFieldLibraryUrl: () => string;
}

export const getTemplatesListMenu = ({
  onImportClick,
  navigateToCasesCreateTemplate,
  getCasesCreateTemplateUrl,
  navigateToCasesFieldLibrary,
  getCasesFieldLibraryUrl,
}: GetTemplatesListMenuArgs): AppHeaderMenu => ({
  items: [
    {
      id: 'fieldLibrary',
      label: fieldLibraryI18n.FIELD_LIBRARY_TITLE,
      iconType: 'database',
      href: getCasesFieldLibraryUrl(),
      run: () => navigateToCasesFieldLibrary(),
      testId: 'field-library-button',
      order: 100,
    },
    {
      id: 'importTemplate',
      label: i18n.IMPORT_TEMPLATE,
      iconType: 'download',
      run: () => onImportClick(),
      testId: 'import-template-button',
      order: 200,
    },
  ],
  primaryActionItem: {
    id: 'createTemplate',
    label: i18n.CREATE_TEMPLATE,
    iconType: 'plusCircle',
    href: getCasesCreateTemplateUrl(),
    run: () => navigateToCasesCreateTemplate(),
    testId: 'create-template-button',
  },
});

interface GetTemplateFormMenuArgs {
  hasChanges: boolean;
  hasValidationErrors: boolean;
  isEdit: boolean;
  isLoading?: boolean;
  isSaving?: boolean;
  isEnabled: boolean;
  submitError: string | null;
  onReset: () => void;
  onSave: () => void;
  onIsEnabledChange: (isEnabled: boolean) => void;
}

export const getTemplateFormBadges = (hasChanges: boolean): AppHeaderBadge[] =>
  hasChanges
    ? [
        {
          label: i18n.UNSAVED_CHANGES,
          color: 'warning',
          'data-test-subj': 'template-unsaved-changes-badge',
        },
      ]
    : [];

export const getTemplateFormMenu = ({
  hasChanges,
  hasValidationErrors,
  isEdit,
  isLoading,
  isSaving,
  isEnabled,
  submitError,
  onReset,
  onSave,
  onIsEnabledChange,
}: GetTemplateFormMenuArgs): AppHeaderMenu => {
  const saveTooltipContent =
    submitError ?? (hasValidationErrors ? i18n.FIX_VALIDATION_ERRORS : undefined);
  const isActionDisabled = Boolean(isLoading || isSaving);
  const isSaveDisabled = isActionDisabled || hasValidationErrors;

  return {
    ...(hasChanges
      ? {
          items: [
            {
              id: 'resetTemplate',
              label: isEdit ? i18n.REVERT_TO_LAST_SAVED : i18n.REVERT_TO_DEFAULT,
              iconType: 'refresh',
              run: () => onReset(),
              disableButton: isActionDisabled,
              tooltipContent: isEdit ? i18n.REVERT_TO_LAST_SAVED : i18n.REVERT_TO_DEFAULT,
              testId: 'resetTemplateButton',
              order: 100,
            },
          ],
        }
      : {}),
    switch: {
      id: 'templateEnabled',
      label: i18n.TEMPLATE_ENABLED,
      labelProps: {},
      checked: isEnabled,
      onChange: onIsEnabledChange,
      disabled: isActionDisabled,
      'data-test-subj': 'templateEnabledSwitch',
    },
    primaryActionItem: {
      id: 'saveTemplate',
      label: isEdit ? i18n.SAVE_TEMPLATE : i18n.CREATE_TEMPLATE,
      iconType: 'save',
      run: () => onSave(),
      isLoading: isSaving,
      disableButton: isSaveDisabled,
      tooltipContent: saveTooltipContent,
      testId: 'saveTemplateHeaderButton',
    },
  };
};
