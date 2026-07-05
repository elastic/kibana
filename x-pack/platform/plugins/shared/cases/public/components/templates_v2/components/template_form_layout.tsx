/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import type { UseFormReturn } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { kbnFullBodyHeightCss } from '@kbn/css-utils/public/full_body_height_css';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { YamlEditorFormValues } from './template_form';
import { useCasesTemplatesNavigation } from '../../../common/navigation';
import { useDebouncedYamlEdit } from '../hooks/use_debounced_yaml_edit';
import * as i18n from '../translations';
import { componentStyles } from './template_form_layout.styles';
import { TEMPLATE_PREVIEW_WIDTH_KEY } from '../constants';
import { TemplateFormHeader } from './template_form_header';
import { TemplateResetModal } from './template_reset_modal';
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
import { splitTemplateDefinition, mergeTemplateDefinition } from '../utils/template_settings_yaml';
import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import type { TemplateSettings } from '../../../../common/types/domain/template/v1';

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
  const { navigateToCasesTemplates } = useCasesTemplatesNavigation();

  const defaultPreviewWidth = Math.floor(window.innerWidth * 0.3);
  const [previewWidth = defaultPreviewWidth, setPreviewWidth] = useLocalStorage(
    TEMPLATE_PREVIEW_WIDTH_KEY,
    defaultPreviewWidth
  );

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [isEnabled, setIsEnabled] = useState(initialIsEnabled);

  // The `connector` and `settings` blocks are edited in the Settings tab form, not the YAML buffer.
  // Split them out of the initial definition so the editor only ever shows fields; they are merged
  // back into the definition on save.
  const {
    fieldsYaml: initialFieldsYaml,
    connector: initialConnector,
    settings: initialSettings,
  } = useMemo(() => splitTemplateDefinition(initialValue), [initialValue]);

  const [settings, setSettings] = useState<TemplateSettings | undefined>(initialSettings);
  const [connector, setConnector] = useState<CaseConnectorWithoutName | undefined>(
    initialConnector
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
  const hasChanges = useMemo(
    () =>
      computeChangedLines(normalizeYamlString(initialFieldsYaml), normalizeYamlString(yamlValue))
        .length > 0,
    [initialFieldsYaml, yamlValue]
  );

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
    setIsResetModalVisible(false);
  }, [handleReset]);

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
        } catch (e) {
          setSubmitError(e?.message ?? i18n.FAILED_TO_SAVE_TEMPLATE);
        }
      },
      () => {
        setSubmitError(i18n.FIX_VALIDATION_ERRORS);
      }
    )();
  }, [form, onCreate, isEnabled, isEdit, clearDraft, yamlValue, connector, settings]);

  const handleIsEnabledChange = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
  }, []);

  return (
    <FormProvider {...form}>
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        css={[kbnFullBodyHeightCss(), styles.wrapper]}
      >
        <EuiFlexItem grow={false}>
          <TemplateFormHeader
            title={title}
            isLoading={isLoading}
            isSaving={isSaving}
            hasChanges={hasChanges}
            isEdit={isEdit}
            submitError={submitError}
            hasValidationErrors={hasValidationErrors}
            isEnabled={isEnabled}
            onBack={navigateToCasesTemplates}
            onReset={handleResetClick}
            onSave={handleSave}
            onIsEnabledChange={handleIsEnabledChange}
          />
        </EuiFlexItem>

        <EuiFlexItem css={css({ overflow: 'hidden', minHeight: 0 })}>
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
            onSettingsChange={setSettings}
            onConnectorChange={setConnector}
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
