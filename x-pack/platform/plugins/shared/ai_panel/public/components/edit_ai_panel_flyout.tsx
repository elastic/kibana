/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useEditFlyoutState } from '../hooks/use_edit_flyout_state';
import { EsqlPreviewSection } from './esql_preview_section';

const EXAMPLE_PROMPTS = [
  i18n.translate('xpack.aiPanel.editFlyout.example1', {
    defaultMessage: 'KPI cards: total count, average value, and trend indicator',
  }),
  i18n.translate('xpack.aiPanel.editFlyout.example2', {
    defaultMessage: 'Status board with color-coded thresholds (green / yellow / red)',
  }),
  i18n.translate('xpack.aiPanel.editFlyout.example3', {
    defaultMessage: 'Timeline of events grouped by category with counts',
  }),
];

export interface EditAiPanelFlyoutProps {
  prompt: string;
  esqlQuery: string | undefined;
  template: string | undefined;
  timeRange: { from: string; to: string } | undefined;
  onSave: (prompt: string, esqlQuery: string | undefined, template: string | undefined) => void;
  onClose: () => void;
}

export const EditAiPanelFlyout = ({
  prompt,
  esqlQuery,
  template,
  timeRange,
  onSave,
  onClose,
}: EditAiPanelFlyoutProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    draftPrompt,
    setDraftPrompt,
    draftEsqlQuery,
    setDraftEsqlQuery,
    draftTemplate,
    setDraftTemplate,
    detectedTimeField,
    isAiAvailable,
    isPreviewLoading,
    previewData,
    previewError,
    handlePreview,
  } = useEditFlyoutState({ prompt, esqlQuery, template, timeRange });

  return (
    <EuiFlyout onClose={onClose} size="s" type="push" aria-labelledby="editAiPanelFlyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="editAiPanelFlyoutTitle">
            {i18n.translate('xpack.aiPanel.editFlyout.title', {
              defaultMessage: 'Edit AI Panel',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFormRow
          label={i18n.translate('xpack.aiPanel.editFlyout.promptLabel', {
            defaultMessage: 'Prompt',
          })}
          helpText={i18n.translate('xpack.aiPanel.editFlyout.promptHelp', {
            defaultMessage: 'Describe what you want the panel to show.',
          })}
          fullWidth
        >
          <EuiTextArea
            value={draftPrompt}
            onChange={(e) => setDraftPrompt(e.target.value)}
            rows={5}
            fullWidth
            disabled={isAiAvailable === false}
            placeholder={i18n.translate('xpack.aiPanel.editFlyout.promptPlaceholder', {
              defaultMessage:
                'e.g. Show a status board of top product categories by revenue with color-coded thresholds...',
            })}
          />
        </EuiFormRow>

        {isAiAvailable === false && (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut
              size="s"
              color="warning"
              iconType="warning"
              title={i18n.translate('xpack.aiPanel.editFlyout.noAiConnector', {
                defaultMessage:
                  'AI features are not available. Configure an AI connector to enable prompt-based generation.',
              })}
              announceOnMount
            />
          </>
        )}

        <EuiSpacer size="s" />

        <EuiText size="xs" color="subdued">
          <p>
            {i18n.translate('xpack.aiPanel.editFlyout.examplesLabel', {
              defaultMessage: 'Examples:',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiFlexGroup wrap gutterSize="xs">
          {EXAMPLE_PROMPTS.map((example) => (
            <EuiFlexItem grow={false} key={example}>
              <EuiBadge
                color="primary"
                onClick={() => setDraftPrompt(example)}
                onClickAriaLabel={i18n.translate('xpack.aiPanel.editFlyout.useExampleAriaLabel', {
                  defaultMessage: 'Use this example prompt',
                })}
              >
                {example}
              </EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        {esqlQuery && (
          <>
            <EuiSpacer size="l" />
            <EsqlPreviewSection
              draftEsqlQuery={draftEsqlQuery}
              onQueryChange={setDraftEsqlQuery}
              detectedTimeField={detectedTimeField}
              isPreviewLoading={isPreviewLoading}
              previewData={previewData}
              previewError={previewError}
              onPreview={handlePreview}
              initialIsOpen={Boolean(esqlQuery)}
            />
          </>
        )}

        <EuiSpacer size="l" />

        <EuiAccordion
          id="editAiPanelTemplateSection"
          buttonContent={
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="editorCodeBlock" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('xpack.aiPanel.editFlyout.templateLabel', {
                      defaultMessage: 'Template (HTML)',
                    })}
                  </strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          initialIsOpen={false}
          paddingSize="s"
        >
          <EuiCallOut
            size="s"
            color="warning"
            title={i18n.translate('xpack.aiPanel.editFlyout.templateWarning', {
              defaultMessage:
                'Advanced: editing the template directly may produce unexpected results if placeholder syntax is broken.',
            })}
          />
          <EuiSpacer size="s" />
          <EuiFormRow
            fullWidth
            helpText={i18n.translate('xpack.aiPanel.editFlyout.templateHelp', {
              defaultMessage:
                'The HTML template uses Liquid syntax filled with live query data. Changing the prompt will regenerate this template.',
            })}
          >
            <div
              css={css({
                height: 400,
                border: euiTheme.border.thin,
                borderRadius: euiTheme.border.radius.small,
              })}
            >
              <CodeEditor
                languageId="liquid"
                value={draftTemplate}
                onChange={setDraftTemplate}
                options={{
                  fontSize: 12,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                  lineNumbers: 'on',
                  folding: true,
                }}
              />
            </div>
          </EuiFormRow>
        </EuiAccordion>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              {i18n.translate('xpack.aiPanel.editFlyout.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              disabled={!draftPrompt.trim() || (isAiAvailable === false && draftPrompt !== prompt)}
              onClick={() => {
                onSave(
                  draftPrompt,
                  draftEsqlQuery.trim() || undefined,
                  draftTemplate.trim() || undefined
                );
                onClose();
              }}
            >
              {i18n.translate('xpack.aiPanel.editFlyout.save', {
                defaultMessage: 'Apply and close',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
