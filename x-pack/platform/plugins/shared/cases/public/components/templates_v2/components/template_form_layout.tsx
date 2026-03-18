/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { updateYamlFieldDefault } from '../utils/update_yaml_field_default';
import { FieldType } from '../field_types/constants';

interface TemplateFormLayoutProps {
  form: UseFormReturn<YamlEditorFormValues>;
  title: string;
  isLoading?: boolean;
  isSaving?: boolean;
  onCreate: (data: YamlEditorFormValues) => Promise<void>;
  isEdit?: boolean;
  storageKey: string;
  initialValue: string;
  templateId?: string;
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
  const [savedValue, setSavedValue] = useState(initialValue);

  useEffect(() => {
    setSavedValue(initialValue);
  }, [initialValue]);

  const {
    value: yamlValue,
    onChange: onYamlChange,
    handleReset,
    isSaving: isYamlSaving,
    isSaved: isYamlSaved,
  } = useDebouncedYamlEdit(
    storageKey,
    initialValue,
    (newValue) => form.setValue('definition', newValue),
    templateId
  );

  const hasChanges = yamlValue !== savedValue;

  const yamlValueRef = useRef(yamlValue);
  yamlValueRef.current = yamlValue;

  const handleFieldDefaultChange = useCallback(
    (fieldName: string, value: string, control: string) => {
      const isNumericControl = control === FieldType.INPUT_NUMBER;
      const parsedValue = isNumericControl && value !== '' ? Number(value) : value;
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
    form.handleSubmit(
      async (data) => {
        try {
          await onCreate(data);
          setSavedValue(data.definition);
        } catch (e) {
          setSubmitError(e?.message ?? i18n.FAILED_TO_SAVE_TEMPLATE);
        }
      },
      () => {
        setSubmitError(i18n.FIX_VALIDATION_ERRORS);
      }
    )();
  }, [form, onCreate]);

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
            onBack={navigateToCasesTemplates}
            onReset={handleResetClick}
            onSave={handleSave}
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
