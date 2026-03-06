/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageHeaderSection,
  EuiPageTemplate,
  EuiSkeletonTitle,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { UseFormReturn } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
  ResizableLayoutOrder,
} from '@kbn/resizable-layout';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { kbnFullBodyHeightCss } from '@kbn/css-utils/public/full_body_height_css';
import type { YamlEditorFormValues } from './template_form';
import { TemplateYamlEditor } from './template_form';
import { TemplatePreview } from './template_preview';
import { useCasesTemplatesNavigation } from '../../../common/navigation';
import { useDebouncedYamlEdit } from '../hooks/use_debounced_yaml_edit';
import * as i18n from '../translations';
import { componentStyles } from './template_form_layout.styles';
import { MIN_EDITOR_WIDTH, MIN_PREVIEW_WIDTH, TEMPLATE_PREVIEW_WIDTH_KEY } from '../constants';

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
  const modalTitleId = useGeneratedHtmlId();

  const defaultPreviewWidth = Math.floor(window.innerWidth * 0.3);
  const [previewWidth = defaultPreviewWidth, setPreviewWidth] = useLocalStorage(
    TEMPLATE_PREVIEW_WIDTH_KEY,
    defaultPreviewWidth
  );

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);

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

  const hasChanges = yamlValue !== initialValue;

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

  const handleCreate = useCallback(() => {
    setSubmitError(null);
    form.handleSubmit(
      async (data) => {
        try {
          await onCreate(data);
        } catch (e) {
          setSubmitError(e?.message ?? 'Failed to save template');
        }
      },
      () => {
        setSubmitError(i18n.FIX_VALIDATION_ERRORS);
      }
    )();
  }, [form, onCreate]);

  const saveTooltipContent = submitError ?? undefined;

  return (
    <FormProvider {...form}>
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        css={[kbnFullBodyHeightCss(), styles.wrapper]}
      >
        <EuiFlexItem grow={false}>
          <EuiPageTemplate offset={0} minHeight={0} grow={false} css={styles.pageTemplate}>
            <EuiPageTemplate.Header
              css={styles.header}
              restrictWidth={false}
              bottomBorder={false}
              paddingSize="m"
              alignItems="bottom"
            >
              <EuiPageHeaderSection css={styles.headerSection}>
                <EuiButtonEmpty
                  iconType="sortLeft"
                  size="xs"
                  flush="left"
                  onClick={navigateToCasesTemplates}
                  aria-label={i18n.BACK_TO_TEMPLATES}
                >
                  {i18n.BACK_TO_TEMPLATES}
                </EuiButtonEmpty>
                <EuiFlexGroup alignItems="center" responsive={false} gutterSize="m">
                  <EuiFlexItem grow={false} css={styles.titleItem}>
                    <EuiSkeletonTitle
                      size="m"
                      isLoading={!!isLoading}
                      contentAriaLabel={title}
                      css={styles.skeletonTitle}
                    >
                      <EuiTitle size="m" css={styles.title}>
                        <h2>{title}</h2>
                      </EuiTitle>
                    </EuiSkeletonTitle>
                  </EuiFlexItem>
                  {hasChanges && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="warning">{i18n.UNSAVED_CHANGES}</EuiBadge>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiPageHeaderSection>

              <EuiPageHeaderSection>
                <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="s">
                  {hasChanges && (
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        content={isEdit ? i18n.REVERT_TO_LAST_SAVED : i18n.REVERT_TO_DEFAULT}
                        disableScreenReaderOutput
                      >
                        <EuiButtonIcon
                          iconType="refresh"
                          onClick={handleResetClick}
                          disabled={isLoading || isSaving}
                          aria-label={isEdit ? i18n.REVERT_TO_LAST_SAVED : i18n.REVERT_TO_DEFAULT}
                          data-test-subj="resetTemplateButton"
                          display="base"
                          size="s"
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem grow={false}>
                    <EuiToolTip content={saveTooltipContent}>
                      <EuiButton
                        fill
                        color="primary"
                        size="s"
                        onClick={handleCreate}
                        disabled={isLoading || isSaving}
                        isLoading={isSaving}
                        data-test-subj="saveTemplateHeaderButton"
                      >
                        {isEdit ? i18n.SAVE_TEMPLATE : i18n.CREATE_TEMPLATE}
                      </EuiButton>
                    </EuiToolTip>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPageHeaderSection>
            </EuiPageTemplate.Header>
          </EuiPageTemplate>
        </EuiFlexItem>

        <EuiFlexItem css={css({ overflow: 'hidden', minHeight: 0 })}>
          {isLoading ? (
            <EuiFlexGroup justifyContent="center" alignItems="center" css={css({ height: '100%' })}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexGroup>
          ) : (
            <ResizableLayout
              className="eui-fullHeight"
              flexPanel={
                <div css={styles.editorPanel}>
                  <TemplateYamlEditor
                    value={yamlValue}
                    onChange={onYamlChange}
                    isSaving={isYamlSaving}
                    isSaved={isYamlSaved}
                    hasUnsavedChanges={hasChanges}
                  />
                </div>
              }
              minFlexPanelSize={MIN_EDITOR_WIDTH}
              fixedPanel={
                <div css={styles.previewPanel}>
                  <TemplatePreview />
                </div>
              }
              fixedPanelSize={previewWidth}
              onFixedPanelSizeChange={setPreviewWidth}
              minFixedPanelSize={MIN_PREVIEW_WIDTH}
              fixedPanelOrder={ResizableLayoutOrder.End}
              mode={ResizableLayoutMode.Resizable}
              direction={ResizableLayoutDirection.Horizontal}
              resizeButtonClassName="templatePreviewResizeButton"
              data-test-subj="templateEditorWithPreviewLayout"
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

      {isResetModalVisible && (
        <EuiConfirmModal
          title={i18n.REVERT_MODAL_TITLE}
          onCancel={handleResetCancel}
          onConfirm={handleResetConfirm}
          cancelButtonText={i18n.REVERT_MODAL_CANCEL}
          confirmButtonText={i18n.REVERT_MODAL_CONFIRM}
          buttonColor="danger"
          defaultFocusedButton="confirm"
          aria-labelledby={modalTitleId}
          titleProps={{ id: modalTitleId }}
        >
          {i18n.REVERT_MODAL_BODY}
        </EuiConfirmModal>
      )}
    </FormProvider>
  );
};

TemplateFormLayout.displayName = 'TemplateFormLayout';
