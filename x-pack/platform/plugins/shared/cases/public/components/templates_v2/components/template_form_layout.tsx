/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageHeaderSection,
  EuiPageTemplate,
  EuiSkeletonTitle,
  EuiTitle,
  EuiToolTip,
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
}

export const TemplateFormLayout: React.FC<TemplateFormLayoutProps> = ({
  form,
  title,
  isLoading,
  isSaving,
  onCreate,
  isEdit = false,
}) => {
  const styles = useMemoCss(componentStyles);
  const { navigateToCasesTemplates } = useCasesTemplatesNavigation();

  const defaultPreviewWidth = Math.floor(window.innerWidth * 0.3);
  const [previewWidth = defaultPreviewWidth, setPreviewWidth] = useLocalStorage(
    TEMPLATE_PREVIEW_WIDTH_KEY,
    defaultPreviewWidth
  );

  const [submitError, setSubmitError] = useState<string | null>(null);

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
        setSubmitError('Please fix validation errors before saving.');
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
                </EuiFlexGroup>
              </EuiPageHeaderSection>

              <EuiPageHeaderSection>
                <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="m">
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
                  <TemplateYamlEditor />
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
    </FormProvider>
  );
};

TemplateFormLayout.displayName = 'TemplateFormLayout';
