/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiBetaBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
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
import type { TimeRange } from '@kbn/es-query';
import { getServices } from '../services';
import { useEditFlyoutState } from '../hooks/use_edit_flyout_state';
import { EsqlPreviewSection } from './esql_preview_section';
import { buildCustomContentContextAttachment } from '../utils/chat_integration';
import { CUSTOM_CONTENT_REFINE_SESSION_TAG } from '../../common/constants';

export interface EditCustomContentFlyoutProps {
  embeddableId: string;
  esqlQuery: string | undefined;
  template: string | undefined;
  timeRange: TimeRange | undefined;
  panelTitle?: string;
  isNewPanel?: boolean;
  onSave: (esqlQuery: string | undefined, template: string | undefined) => void;
  onClose: () => void;
}

export const EditCustomContentFlyout = ({
  embeddableId,
  esqlQuery,
  template,
  timeRange,
  panelTitle,
  isNewPanel,
  onSave,
  onClose,
}: EditCustomContentFlyoutProps) => {
  const { euiTheme } = useEuiTheme();
  const { agentBuilder } = getServices();

  const {
    draftEsqlQuery,
    setDraftEsqlQuery,
    draftTemplate,
    setDraftTemplate,
    isAiAvailable,
    isPreviewLoading,
    previewData,
    previewError,
    handlePreview,
  } = useEditFlyoutState({ esqlQuery, template, timeRange });

  const handleGenerateWithChat = useCallback(() => {
    if (!agentBuilder) return;
    agentBuilder.openChat({
      attachments: [
        buildCustomContentContextAttachment(
          draftTemplate,
          draftEsqlQuery || undefined,
          embeddableId,
          panelTitle
        ),
      ],
      sessionTag: `${CUSTOM_CONTENT_REFINE_SESSION_TAG}-${embeddableId}`,
    });
    onClose();
  }, [agentBuilder, draftTemplate, draftEsqlQuery, embeddableId, panelTitle, onClose]);

  const hasChanges = draftEsqlQuery !== (esqlQuery ?? '') || draftTemplate !== (template ?? '');

  const handleSave = useCallback(() => {
    onSave(draftEsqlQuery || undefined, draftTemplate || undefined);
    onClose();
  }, [draftEsqlQuery, draftTemplate, onSave, onClose]);

  const editorContainerCss = css({
    position: 'relative',
    border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
    borderRadius: euiTheme.border.radius.medium,
    overflow: 'hidden',
  });

  const copyButtonCss = css({
    position: 'absolute',
    top: euiTheme.size.xs,
    right: euiTheme.size.m,
    zIndex: 1,
  });

  return (
    <EuiFlyout
      type="push"
      size={600}
      resizable
      minWidth={320}
      paddingSize="m"
      onClose={onClose}
      aria-labelledby="edit-custom-panel-flyout-title"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id="edit-custom-panel-flyout-title">
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
                {i18n.translate('xpack.customContent.editFlyout.generateWithChatButton', {
                  defaultMessage: 'Refine with chat',
                })}
              </AiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        <EuiFormRow
          fullWidth
          helpText={i18n.translate('xpack.customContent.editFlyout.templateHelpText', {
            defaultMessage: 'The HTML template uses Liquid syntax filled with live query data.',
          })}
        >
          <div css={editorContainerCss}>
            <CodeEditor
              languageId="liquid"
              value={draftTemplate}
              onChange={setDraftTemplate}
              height={240}
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
            >
              <EuiButtonIcon
                css={copyButtonCss}
                iconType="copyClipboard"
                aria-label={i18n.translate('xpack.customContent.editFlyout.copyTemplate', {
                  defaultMessage: 'Copy template',
                })}
                onClick={() => navigator.clipboard?.writeText(draftTemplate)}
              />
            </EuiToolTip>
          </div>
        </EuiFormRow>

        <EuiSpacer size="m" />

        {/* ES|QL accordion */}
        <EsqlPreviewSection
          esqlQuery={draftEsqlQuery}
          onEsqlQueryChange={setDraftEsqlQuery}
          isPreviewLoading={isPreviewLoading}
          previewData={previewData}
          previewError={previewError}
          onPreview={handlePreview}
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              {i18n.translate('xpack.customContent.editFlyout.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={handleSave} disabled={!hasChanges}>
              {i18n.translate('xpack.customContent.editFlyout.applyButton', {
                defaultMessage: 'Apply and close',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
