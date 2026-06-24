/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiBasicTable,
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
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { CodeEditor } from '@kbn/code-editor';
import { HANDLEBARS_LANG_ID } from '@kbn/monaco';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { getServices } from '../services';

const EXAMPLE_PROMPTS = [
  i18n.translate('aiSummaryPanel.editFlyout.example1', {
    defaultMessage: 'KPI cards: total count, average value, and trend indicator',
  }),
  i18n.translate('aiSummaryPanel.editFlyout.example2', {
    defaultMessage: 'Status board with color-coded thresholds (green / yellow / red)',
  }),
  i18n.translate('aiSummaryPanel.editFlyout.example3', {
    defaultMessage: 'Top 5 items ranked by value with horizontal percentage bars',
  }),
  i18n.translate('aiSummaryPanel.editFlyout.example4', {
    defaultMessage: 'Timeline of events grouped by category with counts',
  }),
];

interface PreviewData {
  columns: Array<{ name: string; type: string }>;
  rows: unknown[][];
}

interface EditAiPanelFlyoutProps {
  prompt: string;
  esqlQuery: string | undefined;
  template: string | undefined;
  timeRange: { from: string; to: string } | undefined;
  onSave: (prompt: string, esqlQuery: string | undefined, template: string | undefined) => void;
  onClose: () => void;
}

const monoTextAreaCss = css({
  fontFamily: 'monospace',
  fontSize: '12px',
});

export const EditAiPanelFlyout = ({
  prompt,
  esqlQuery,
  template,
  timeRange,
  onSave,
  onClose,
}: EditAiPanelFlyoutProps) => {
  const [draftPrompt, setDraftPrompt] = useState(prompt);
  const [draftEsqlQuery, setDraftEsqlQuery] = useState(esqlQuery ?? '');
  const [draftTemplate, setDraftTemplate] = useState(template ?? '');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const handlePreview = async () => {
    if (!draftEsqlQuery.trim()) return;
    setIsPreviewLoading(true);
    setPreviewData(null);
    setPreviewError(null);
    try {
      const result = await getServices().http.post<PreviewData>(
        '/internal/ai_summary_panel/esql_data',
        { body: JSON.stringify({ esqlQuery: draftEsqlQuery, timeRange }) }
      );
      setPreviewData({ ...result, rows: result.rows.slice(0, 10) });
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const tableColumns: Array<EuiBasicTableColumn<Record<string, unknown>>> =
    previewData?.columns.map((col) => ({
      field: col.name,
      name: col.name,
      truncateText: true,
      width: '140px',
      render: (val: unknown) => {
        const str = String(val ?? '');
        return str.length > 30 ? `${str.slice(0, 30)}…` : str;
      },
    })) ?? [];

  const tableItems: Array<Record<string, unknown>> =
    previewData?.rows.map((row, i) => {
      const item: Record<string, unknown> = { _id: String(i) };
      previewData.columns.forEach((col, j) => {
        item[col.name] = row[j];
      });
      return item;
    }) ?? [];

  return (
    <EuiFlyout onClose={onClose} size="m" aria-labelledby="editAiPanelFlyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="editAiPanelFlyoutTitle">
            {i18n.translate('aiSummaryPanel.editFlyout.title', {
              defaultMessage: 'Edit AI Panel',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFormRow
          label={i18n.translate('aiSummaryPanel.editFlyout.promptLabel', {
            defaultMessage: 'Prompt',
          })}
          helpText={i18n.translate('aiSummaryPanel.editFlyout.promptHelp', {
            defaultMessage: 'Describe what you want the panel to show.',
          })}
          fullWidth
        >
          <EuiTextArea
            value={draftPrompt}
            onChange={(e) => setDraftPrompt(e.target.value)}
            rows={5}
            fullWidth
            placeholder={i18n.translate('aiSummaryPanel.editFlyout.promptPlaceholder', {
              defaultMessage:
                'e.g. Show a status board of top product categories by revenue with color-coded thresholds...',
            })}
          />
        </EuiFormRow>

        <EuiSpacer size="s" />

        <EuiText size="xs" color="subdued">
          <p>
            {i18n.translate('aiSummaryPanel.editFlyout.examplesLabel', {
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
                onClickAriaLabel={i18n.translate('aiSummaryPanel.editFlyout.useExampleAriaLabel', {
                  defaultMessage: 'Use this example prompt',
                })}
              >
                {example}
              </EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <EuiAccordion
          id="editAiPanelEsqlSection"
          buttonContent={
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="database" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('aiSummaryPanel.editFlyout.dataSourceLabel', {
                      defaultMessage: 'Data source (ES|QL)',
                    })}
                  </strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          initialIsOpen={Boolean(esqlQuery)}
          paddingSize="s"
        >
          <EuiFormRow
            fullWidth
            helpText={i18n.translate('aiSummaryPanel.editFlyout.esqlHelp', {
              defaultMessage:
                'Query results are passed to the AI as context when generating the panel.',
            })}
          >
            <EuiTextArea
              css={monoTextAreaCss}
              value={draftEsqlQuery}
              onChange={(e) => {
                setDraftEsqlQuery(e.target.value);
                setPreviewData(null);
                setPreviewError(null);
              }}
              rows={5}
              fullWidth
              placeholder="FROM index | STATS total = SUM(value) BY category | SORT total DESC | LIMIT 10"
            />
          </EuiFormRow>

          <EuiSpacer size="s" />

          <EuiCallOut
            size="s"
            color="primary"
            title={i18n.translate('aiSummaryPanel.editFlyout.timeRangeHint', {
              defaultMessage:
                'When a date field is found in your index, a time range filter is injected automatically to connect to the dashboard time picker.',
            })}
          />

          <EuiSpacer size="s" />

          <EuiButton
            size="s"
            fill
            color="primary"
            iconType="play"
            onClick={handlePreview}
            isLoading={isPreviewLoading}
            disabled={!draftEsqlQuery.trim()}
          >
            {i18n.translate('aiSummaryPanel.editFlyout.previewData', {
              defaultMessage: 'Preview data',
            })}
          </EuiButton>

          {previewError && (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut color="danger" size="s" title={previewError} />
            </>
          )}

          {previewData && previewData.rows.length === 0 && (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut
                size="s"
                color="warning"
                title={i18n.translate('aiSummaryPanel.editFlyout.noRows', {
                  defaultMessage: 'Query returned no rows for the current time range.',
                })}
              />
            </>
          )}

          {previewData && previewData.rows.length > 0 && (
            <>
              <EuiSpacer size="s" />
              <EuiBasicTable<Record<string, unknown>>
                tableCaption={i18n.translate('aiSummaryPanel.editFlyout.previewCaption', {
                  defaultMessage: 'ES|QL query preview',
                })}
                items={tableItems}
                rowHeader="_id"
                columns={tableColumns}
                compressed
              />
            </>
          )}
        </EuiAccordion>

        <EuiSpacer size="l" />

        <EuiAccordion
          id="editAiPanelTemplateSection"
          buttonContent={
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="editorCodeBlock" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('aiSummaryPanel.editFlyout.templateLabel', {
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
            title={i18n.translate('aiSummaryPanel.editFlyout.templateWarning', {
              defaultMessage:
                'Advanced: editing the template directly may produce unexpected results if placeholder syntax is broken.',
            })}
          />
          <EuiSpacer size="s" />
          <EuiFormRow
            fullWidth
            helpText={i18n.translate('aiSummaryPanel.editFlyout.templateHelp', {
              defaultMessage:
                'The HTML template uses {{column_name}} placeholders filled with live query data. Changing the prompt or query will regenerate this template.',
            })}
          >
            <div css={css({ height: 400, border: '1px solid #D3DAE6', borderRadius: 4 })}>
              <CodeEditor
                languageId={HANDLEBARS_LANG_ID}
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
              {i18n.translate('aiSummaryPanel.editFlyout.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              disabled={!draftPrompt.trim()}
              onClick={() => {
                onSave(
                  draftPrompt,
                  draftEsqlQuery.trim() || undefined,
                  draftTemplate.trim() || undefined
                );
                onClose();
              }}
            >
              {i18n.translate('aiSummaryPanel.editFlyout.save', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
