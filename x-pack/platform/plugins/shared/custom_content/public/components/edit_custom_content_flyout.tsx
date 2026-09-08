/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  EuiBetaBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiResizeObserver,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiButton,
  EuiToolTip,
  useEuiTheme,
  EuiFormRow,
} from '@elastic/eui';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
import type { AggregateQuery, Filter, Query, TimeRange, ProjectRouting } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { useEditFlyoutState } from '../hooks/use_edit_flyout_state';
import { EsqlPreviewSection } from './esql_preview_section';
import { getTelemetry } from '../telemetry';

const EDITOR_DEFAULT_HEIGHT = 400;
// Intentionally overestimated (header + footer + body padding + template label row + spacers + help text)
// so the computed max-height always prevents a scrollbar regardless of minor layout changes.
const FLYOUT_FIXED_CHROME_HEIGHT = 380;

export interface EditCustomContentFlyoutProps {
  esqlQuery: string | undefined;
  template: string | undefined;
  timeRange: TimeRange | undefined;
  isApproximate: boolean;
  projectRouting: ProjectRouting | undefined;
  query: Query | AggregateQuery | undefined;
  filters: Filter[] | undefined;
  esqlVariables: ESQLControlVariable[] | undefined;
  isNewPanel?: boolean;
  ariaLabelledBy?: string;
  onSave: (esqlQuery: string | undefined, template: string | undefined) => void;
  onClose: () => void;
  onRunPreview: (html: string) => void;
  onGenerateWithChat?: (template: string, esqlQuery: string | undefined) => void;
}

export const EditCustomContentFlyout = ({
  esqlQuery,
  template,
  timeRange,
  isApproximate,
  projectRouting,
  query,
  filters,
  esqlVariables,
  isNewPanel,
  ariaLabelledBy,
  onSave,
  onClose,
  onRunPreview,
  onGenerateWithChat,
}: EditCustomContentFlyoutProps) => {
  const { euiTheme, colorMode } = useEuiTheme();

  const {
    draftEsqlQuery,
    setDraftEsqlQuery,
    draftTemplate,
    setDraftTemplate,
    isAiAvailable,
    isDataLoading,
    esqlData,
    esqlDataError,
    handleFetchData,
    isRenderLoading,
    handleRender,
  } = useEditFlyoutState({
    esqlQuery,
    template,
    timeRange,
    isApproximate,
    projectRouting,
    query,
    filters,
    esqlVariables,
    colorMode,
    euiTheme,
    onRunPreview,
  });

  const handleGenerateWithChat = useCallback(() => {
    getTelemetry().trackGenerateWithChatClicked({
      triggerSource: 'flyout',
      hasExistingTemplate: Boolean(draftTemplate),
    });
    onGenerateWithChat?.(draftTemplate, draftEsqlQuery || undefined);
  }, [onGenerateWithChat, draftTemplate, draftEsqlQuery]);

  const hasChanges = draftEsqlQuery !== (esqlQuery ?? '') || draftTemplate !== (template ?? '');

  const handleSave = useCallback(() => {
    getTelemetry().trackPanelSaved({
      isNewPanel: isNewPanel ?? false,
      hasTemplate: Boolean(draftTemplate),
      hasEsqlQuery: Boolean(draftEsqlQuery),
      templateSizeBytes: draftTemplate.length,
    });
    onSave(draftEsqlQuery || undefined, draftTemplate || undefined);
  }, [draftEsqlQuery, draftTemplate, isNewPanel, onSave]);

  const [editorHeight, setEditorHeight] = useState(EDITOR_DEFAULT_HEIGHT);
  const [maxEditorHeight, setMaxEditorHeight] = useState<number | undefined>(undefined);
  const editorHeightRef = useRef(EDITOR_DEFAULT_HEIGHT);

  const onEsqlSectionResize = useCallback(({ height }: { width: number; height: number }) => {
    setMaxEditorHeight(
      Math.max(EDITOR_DEFAULT_HEIGHT, window.innerHeight - FLYOUT_FIXED_CHROME_HEIGHT - height)
    );
  }, []);

  const onEditorContainerResize = useCallback(({ height }: { width: number; height: number }) => {
    if (height !== editorHeightRef.current) {
      editorHeightRef.current = height;
      setEditorHeight(height);
    }
  }, []);

  const editorContainerCss = css({
    position: 'relative',
    resize: 'vertical',
    minHeight: EDITOR_DEFAULT_HEIGHT,
    height: EDITOR_DEFAULT_HEIGHT,
    ...(maxEditorHeight !== undefined && { maxHeight: maxEditorHeight }),
    border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
    borderRadius: euiTheme.border.radius.medium,
    overflow: 'hidden',
  });

  const copyButtonCss = css({
    position: 'absolute',
    top: euiTheme.size.xs,
    right: euiTheme.size.m,
    zIndex: euiTheme.levels.content,
  });

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2
                id={ariaLabelledBy ?? 'edit-custom-panel-flyout-title'}
                data-test-subj={
                  isNewPanel ? 'customContentCreateFlyoutTitle' : 'customContentEditFlyoutTitle'
                }
              >
                {isNewPanel
                  ? i18n.translate('xpack.customContent.editFlyout.createTitle', {
                      defaultMessage: 'Create custom panel',
                    })
                  : i18n.translate('xpack.customContent.editFlyout.editTitle', {
                      defaultMessage: 'Edit custom panel',
                    })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.customContent.editFlyout.experimentalTooltip', {
                defaultMessage:
                  'Custom panels are in technical preview and may change or be removed in future releases.',
              })}
            >
              <EuiBetaBadge
                tabIndex={0}
                iconType="flask"
                label={i18n.translate('xpack.customContent.editFlyout.experimentalLabel', {
                  defaultMessage: 'Technical preview',
                })}
                size="s"
                css={{ verticalAlign: 'middle' }}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {/* Template section */}
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {'</>'}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('xpack.customContent.editFlyout.templateLabel', {
                      defaultMessage: 'Template (HTML)',
                    })}
                  </strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {isAiAvailable && (
            <EuiFlexItem grow={false}>
              <AiButton size="s" iconType="sparkles" onClick={handleGenerateWithChat}>
                {draftTemplate
                  ? i18n.translate('xpack.customContent.editFlyout.refineWithChatButton', {
                      defaultMessage: 'Refine with chat',
                    })
                  : i18n.translate('xpack.customContent.editFlyout.generateWithChatButton', {
                      defaultMessage: 'Generate with chat',
                    })}
              </AiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        <EuiFormRow
          fullWidth
          helpText={i18n.translate('xpack.customContent.editFlyout.templateHelpText', {
            defaultMessage:
              'HTML and CSS, with Liquid tags to insert ES|QL results. For each row, row["column"].value is the value and row["column"].pct is its percentage of the column\'s highest value, useful for bar widths.',
          })}
        >
          <EuiResizeObserver onResize={onEditorContainerResize}>
            {(editorResizeRef) => (
              <div
                ref={editorResizeRef}
                css={editorContainerCss}
                data-test-subj="customContentTemplateEditorContainer"
              >
                <CodeEditor
                  languageId="liquid"
                  value={draftTemplate}
                  onChange={setDraftTemplate}
                  height={editorHeight}
                  placeholder={
                    isAiAvailable
                      ? i18n.translate('xpack.customContent.editFlyout.templatePlaceholderAi', {
                          defaultMessage:
                            '<!-- Write your HTML, CSS, and Liquid here, or select Generate with chat. -->',
                        })
                      : i18n.translate('xpack.customContent.editFlyout.templatePlaceholderNoAi', {
                          defaultMessage: '<!-- Write your HTML, CSS, and Liquid here. -->',
                        })
                  }
                  options={{
                    fontSize: 12,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    folding: true,
                  }}
                />
                <EuiToolTip
                  content={i18n.translate('xpack.customContent.editFlyout.copyTemplate', {
                    defaultMessage: 'Copy template',
                  })}
                  disableScreenReaderOutput
                  anchorProps={{ css: copyButtonCss }}
                >
                  <EuiButtonIcon
                    iconType="copy"
                    aria-label={i18n.translate('xpack.customContent.editFlyout.copyTemplate', {
                      defaultMessage: 'Copy template',
                    })}
                    onClick={() => navigator.clipboard?.writeText(draftTemplate)}
                    data-test-subj="customContentCopyTemplateButton"
                  />
                </EuiToolTip>
              </div>
            )}
          </EuiResizeObserver>
        </EuiFormRow>

        <EuiSpacer size="m" />

        {/* ES|QL accordion */}
        <EuiResizeObserver onResize={onEsqlSectionResize}>
          {(resizeRef) => (
            <div ref={resizeRef}>
              <EsqlPreviewSection
                esqlQuery={draftEsqlQuery}
                onEsqlQueryChange={setDraftEsqlQuery}
                isDataLoading={isDataLoading}
                esqlData={esqlData}
                esqlDataError={esqlDataError}
                onFetchData={handleFetchData}
                esqlVariables={esqlVariables}
              />
            </div>
          )}
        </EuiResizeObserver>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="customContentCancelButton">
              {i18n.translate('xpack.customContent.editFlyout.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="success"
                  iconType="play"
                  isLoading={isRenderLoading}
                  disabled={!draftTemplate.trim()}
                  onClick={handleRender}
                  data-test-subj="customContentRunPreviewButton"
                >
                  {i18n.translate('xpack.customContent.editFlyout.runPreviewButton', {
                    defaultMessage: 'Run preview',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  onClick={handleSave}
                  disabled={!hasChanges}
                  data-test-subj="customContentApplyButton"
                >
                  {i18n.translate('xpack.customContent.editFlyout.applyButton', {
                    defaultMessage: 'Apply and close',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
