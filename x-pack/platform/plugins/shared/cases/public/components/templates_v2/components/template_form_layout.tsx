/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { AppHeader } from '@kbn/app-header';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEqual } from 'lodash';
import type { UseFormReturn } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { kbnFullBodyHeightCss } from '@kbn/css-utils/public/full_body_height_css';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useCasesLocalStorage } from '../../../common/use_cases_local_storage';
import type { YamlEditorFormValues } from './template_form';
import { useCasesTemplatesNavigation } from '../../../common/navigation';
import { useDebouncedYamlEdit } from '../hooks/use_debounced_yaml_edit';
import * as i18n from '../translations';
import { componentStyles } from './template_form_layout.styles';
import { TEMPLATE_PREVIEW_WIDTH_KEY } from '../constants';
import { TemplateResetModal } from './template_reset_modal';
import { getTemplateFormBadges, getTemplateFormMenu } from './header_menu';
import { TemplateEditorLayout } from './template_editor_layout';
import {
  type FieldDefaultValue,
  updateYamlFieldDefault,
  removeYamlFieldDefault,
} from '../utils/update_yaml_field_default';
import { validateTemplateDefinitionYaml } from '../utils/validate_template_definition';
import { computeChangedLines } from '../hooks/use_line_differences_decorations';
import {
  FieldType,
  UserPickerDefaultSchema,
} from '../../../../common/types/domain/template/fields';
import { normalizeYamlString } from '../utils/normalize_yaml_string';
import {
  splitTemplateDefinition,
  mergeTemplateDefinition,
  normalizeTemplateSettings,
  normalizeTemplateConnector,
} from '../utils/template_settings_yaml';
import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import type { TemplateSettings } from '../../../../common/types/domain/template/v1';

interface SettingsConnectorDraft {
  templateId?: string;
  settings?: TemplateSettings;
  connector?: CaseConnectorWithoutName;
}

interface TemplateFormLayoutProps {
  form: UseFormReturn<YamlEditorFormValues>;
  title: string;
  isLoading?: boolean;
  isSaving?: boolean;
  onCreate: (data: YamlEditorFormValues, isEnabled: boolean) => Promise<void>;
  isEdit?: boolean;
  storageKey: string;
  initialValue: string;
  templateId?: string;
  initialIsEnabled?: boolean;
}

export const TemplateFormLayout: React.FC<TemplateFormLayoutProps> = ({
  form,
  title,
  isLoading,
  isSaving,
  onCreate,
  isEdit = false,
  storageKey,
  initialValue,
  templateId,
  initialIsEnabled = true,
}) => {
  const styles = useMemoCss(componentStyles);
  const { getCasesTemplatesUrl, navigateToCasesTemplates } = useCasesTemplatesNavigation();

  const defaultPreviewWidth = Math.floor(window.innerWidth * 0.3);
  const [previewWidth = defaultPreviewWidth, setPreviewWidth] = useLocalStorage(
    TEMPLATE_PREVIEW_WIDTH_KEY,
    defaultPreviewWidth
  );

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [isEnabled, setIsEnabled] = useState(initialIsEnabled);
  // Bumped whenever we revert the Settings-tab state to its initial values (Reset). The connector
  // picker runs its own hook_form_lib form that only seeds from `defaultValue` at mount, so it's
  // remounted via this key to re-seed from the reverted connector. Keyed on a counter (not the
  // connector object) so editing the connector fields never remounts and drops focus.
  const [formResetKey, setFormResetKey] = useState(0);

  // `connector` / `settings` are edited in the Settings tab, not the YAML buffer, so split them out
  // of the initial definition (the editor shows fields only) and merge them back on save.
  const {
    fieldsYaml: initialFieldsYaml,
    connector: initialConnector,
    settings: initialSettings,
  } = useMemo(() => splitTemplateDefinition(initialValue), [initialValue]);

  // Settings-tab state isn't in the YAML buffer, so persist it alongside the YAML draft (keyed to
  // the template) so edits survive a reload and count as unsaved changes.
  const initialFormState = useMemo<SettingsConnectorDraft>(
    () => ({ templateId, settings: initialSettings, connector: initialConnector }),
    [templateId, initialSettings, initialConnector]
  );
  const [storedFormState, setStoredFormState] = useCasesLocalStorage<SettingsConnectorDraft>(
    `${storageKey}.settingsConnector`,
    initialFormState
  );
  // Only reuse a persisted draft that belongs to the current template (mirrors the YAML draft).
  const useStoredFormState = storedFormState != null && storedFormState.templateId === templateId;
  const settings = useStoredFormState ? storedFormState.settings : initialSettings;
  const connector = useStoredFormState ? storedFormState.connector : initialConnector;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const connectorRef = useRef(connector);
  connectorRef.current = connector;

  const handleSettingsChange = useCallback(
    (next: TemplateSettings) =>
      setStoredFormState({ templateId, settings: next, connector: connectorRef.current }),
    [setStoredFormState, templateId]
  );
  const handleConnectorChange = useCallback(
    (next: CaseConnectorWithoutName) =>
      setStoredFormState({ templateId, settings: settingsRef.current, connector: next }),
    [setStoredFormState, templateId]
  );

  const {
    value: yamlValue,
    onChange: onYamlChange,
    handleReset,
    clearDraft,
    isSaving: isYamlSaving,
    isSaved: isYamlSaved,
  } = useDebouncedYamlEdit(
    storageKey,
    initialFieldsYaml,
    (newValue) => form.setValue('definition', newValue),
    templateId
  );
  const hasChanges = useMemo(() => {
    const yamlChanged =
      computeChangedLines(normalizeYamlString(initialFieldsYaml), normalizeYamlString(yamlValue))
        .length > 0;
    // Settings-tab edits (connector + case settings) count as unsaved changes too. Compare the
    // normalized forms so the connector form's "no connector" shape (`.none`) and empty settings
    // don't read as changes against the unset initial state.
    const settingsChanged = !isEqual(
      normalizeTemplateSettings(settings),
      normalizeTemplateSettings(initialSettings)
    );
    const connectorChanged = !isEqual(
      normalizeTemplateConnector(connector),
      normalizeTemplateConnector(initialConnector)
    );
    return yamlChanged || settingsChanged || connectorChanged;
  }, [initialFieldsYaml, yamlValue, settings, initialSettings, connector, initialConnector]);

  const hasValidationErrors = useMemo(
    () => !validateTemplateDefinitionYaml(yamlValue ?? '').success,
    [yamlValue]
  );

  const yamlValueRef = useRef(yamlValue);
  yamlValueRef.current = yamlValue;

  const handleFieldDefaultChange = useCallback(
    (fieldName: string, value: string, control: string) => {
      const isEmptyNumeric = control === FieldType.INPUT_NUMBER && value.trim() === '';
      const isEmptyUserPicker =
        control === FieldType.USER_PICKER && (value === '' || value === '[]');

      if (isEmptyNumeric || isEmptyUserPicker) {
        const updatedYaml = removeYamlFieldDefault(yamlValueRef.current, fieldName);
        if (updatedYaml !== yamlValueRef.current) {
          onYamlChange(updatedYaml);
        }
        return;
      }

      let parsedValue: FieldDefaultValue;
      if (control === FieldType.INPUT_NUMBER) {
        parsedValue = Number(value.trim());
      } else if (control === FieldType.CHECKBOX_GROUP) {
        try {
          parsedValue = JSON.parse(value) as string[];
        } catch {
          parsedValue = [];
        }
      } else if (control === FieldType.USER_PICKER) {
        try {
          const result = UserPickerDefaultSchema.safeParse(JSON.parse(value));
          parsedValue = result.success ? result.data : [];
        } catch {
          parsedValue = [];
        }
      } else {
        parsedValue = value;
      }
      const updatedYaml = updateYamlFieldDefault(yamlValueRef.current, fieldName, parsedValue);
      if (updatedYaml !== yamlValueRef.current) {
        onYamlChange(updatedYaml);
      }
    },
    [onYamlChange]
  );

  const handleResetClick = useCallback(() => {
    setIsResetModalVisible(true);
  }, []);

  const handleResetConfirm = useCallback(() => {
    handleReset();
    setStoredFormState(initialFormState);
    // Remount the connector picker so it re-seeds from the reverted connector (see formResetKey).
    setFormResetKey((count) => count + 1);
    setIsResetModalVisible(false);
  }, [handleReset, setStoredFormState, initialFormState]);

  const handleResetCancel = useCallback(() => {
    setIsResetModalVisible(false);
  }, []);

  const handleSave = useCallback(() => {
    setSubmitError(null);

    // Merge the form-managed connector/settings back into the fields YAML, then validate the
    // complete definition that will actually be persisted.
    const mergedDefinition = mergeTemplateDefinition(yamlValue ?? '', { connector, settings });

    const validationResult = validateTemplateDefinitionYaml(mergedDefinition);
    if (!validationResult.success) {
      setSubmitError(i18n.FIX_VALIDATION_ERRORS);
      return;
    }

    form.handleSubmit(
      async (data) => {
        try {
          await onCreate({ ...data, definition: mergedDefinition }, isEnabled);
          clearDraft(isEdit ? data.definition : undefined);
          // Reset the persisted Settings-tab draft: keep the saved values when editing, revert to
          // the template's defaults when creating (mirrors clearDraft's create/edit behavior).
          setStoredFormState(isEdit ? { templateId, settings, connector } : initialFormState);
        } catch (e) {
          setSubmitError(e?.message ?? i18n.FAILED_TO_SAVE_TEMPLATE);
        }
      },
      () => {
        setSubmitError(i18n.FIX_VALIDATION_ERRORS);
      }
    )();
  }, [
    form,
    onCreate,
    isEnabled,
    isEdit,
    clearDraft,
    yamlValue,
    connector,
    settings,
    setStoredFormState,
    templateId,
    initialFormState,
  ]);

  const handleIsEnabledChange = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
  }, []);

  const templateFormMenu = useMemo(
    () =>
      getTemplateFormMenu({
        hasChanges,
        hasValidationErrors,
        isEdit,
        isLoading,
        isSaving,
        isEnabled,
        submitError,
        onReset: handleResetClick,
        onSave: handleSave,
        onIsEnabledChange: handleIsEnabledChange,
      }),
    [
      handleIsEnabledChange,
      handleResetClick,
      handleSave,
      hasChanges,
      hasValidationErrors,
      isEdit,
      isEnabled,
      isLoading,
      isSaving,
      submitError,
    ]
  );

  const templateFormBadges = useMemo(() => getTemplateFormBadges(hasChanges), [hasChanges]);

  const templateFormBack = useMemo(
    () => ({
      href: getCasesTemplatesUrl(),
      // `AppHeader` renders this as "Back to {label}", so pass just the destination name.
      label: i18n.TEMPLATE_TITLE,
      // AppHeader's back button keeps its `href` on the rendered anchor, so the default
      // navigation must be prevented here to avoid a full page reload alongside the SPA one.
      onClick: (event: React.MouseEvent) => {
        event.preventDefault();
        navigateToCasesTemplates();
      },
    }),
    [getCasesTemplatesUrl, navigateToCasesTemplates]
  );

  return (
    <FormProvider {...form}>
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        // The header cancels the page-section padding itself (see its `padding` prop below),
        // so the wrapper only needs to reserve the Security Solution timeline bottom bar
        // (57px, the same value used by the validation accordion). This makes the page
        // fill the viewport exactly and never scroll the header under the sticky top bar.
        css={[kbnFullBodyHeightCss('57px'), styles.wrapper]}
      >
        <EuiFlexItem grow={false}>
          <AppHeader
            title={title}
            back={templateFormBack}
            badges={templateFormBadges}
            menu={templateFormMenu}
            sticky={false}
            // Breaks the header out to the surrounding EuiPageSection's edges (top/left/right)
            // and re-insets its content by the same amount, so it runs edge-to-edge while the
            // title/menu stay aligned with the page gutter.
            padding={{ bleed: 'l' }}
          />
        </EuiFlexItem>

        <EuiFlexItem css={styles.editorWrapper}>
          <TemplateEditorLayout
            isLoading={isLoading}
            yamlValue={yamlValue}
            onYamlChange={onYamlChange}
            onFieldDefaultChange={handleFieldDefaultChange}
            isYamlSaving={isYamlSaving}
            isYamlSaved={isYamlSaved}
            previewWidth={previewWidth}
            onPreviewWidthChange={setPreviewWidth}
            savedValue={isEdit ? initialFieldsYaml : undefined}
            settings={settings}
            connector={connector}
            onSettingsChange={handleSettingsChange}
            onConnectorChange={handleConnectorChange}
            formResetKey={formResetKey}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {isResetModalVisible && (
        <TemplateResetModal onCancel={handleResetCancel} onConfirm={handleResetConfirm} />
      )}
    </FormProvider>
  );
};

TemplateFormLayout.displayName = 'TemplateFormLayout';
