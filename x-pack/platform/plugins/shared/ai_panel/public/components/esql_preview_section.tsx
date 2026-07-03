/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { ESQLLangEditor } from '@kbn/esql/public';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { EsqlDataResult } from '../utils/fetch_esql_data';

interface EsqlPreviewSectionProps {
  draftEsqlQuery: string;
  onQueryChange: (q: string) => void;
  detectedTimeField: string | undefined;
  isPreviewLoading: boolean;
  previewData: EsqlDataResult | null;
  previewError: string | null;
  onPreview: () => void;
  initialIsOpen: boolean;
}

export const EsqlPreviewSection = ({
  draftEsqlQuery,
  onQueryChange,
  detectedTimeField,
  isPreviewLoading,
  previewData,
  previewError,
  onPreview,
  initialIsOpen,
}: EsqlPreviewSectionProps) => {
  const previewRows = ((previewData?.values ?? []) as unknown[][]).slice(0, 10);

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

  const tableItems: Array<Record<string, unknown>> = previewRows.map((row, i) => {
    const item: Record<string, unknown> = { _id: String(i) };
    previewData?.columns.forEach((col, j) => {
      item[col.name] = row[j];
    });
    return item;
  });

  return (
    <EuiAccordion
      id="editAiPanelEsqlSection"
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="database" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>
                {i18n.translate('xpack.aiPanel.editFlyout.dataSourceLabel', {
                  defaultMessage: 'Data source (ES|QL)',
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      initialIsOpen={initialIsOpen}
      paddingSize="s"
    >
      <ESQLLangEditor
        query={{ esql: draftEsqlQuery }}
        onTextLangQueryChange={(q) => onQueryChange(q.esql ?? '')}
        onTextLangQuerySubmit={async () => {}}
        editorIsInline
        hasOutline
        hideRunQueryButton
        hideQueryHistory
        disableAutoFocus
        initialState={{ editorHeight: 120 }}
        errors={[]}
      />

      <EuiSpacer size="s" />

      {draftEsqlQuery.trim() && !detectedTimeField && (
        <EuiCallOut
          size="s"
          color="primary"
          title={i18n.translate('xpack.aiPanel.editFlyout.timeRangeHint', {
            defaultMessage:
              'To connect to the dashboard time picker, add a WHERE clause with named time parameters. Example: WHERE dateField >= ?_tstart AND dateField < ?_tend',
          })}
          announceOnMount
        />
      )}

      <EuiSpacer size="s" />

      <EuiButton
        size="s"
        fill
        color="primary"
        iconType="play"
        onClick={onPreview}
        isLoading={isPreviewLoading}
        disabled={!draftEsqlQuery.trim()}
      >
        {i18n.translate('xpack.aiPanel.editFlyout.previewData', {
          defaultMessage: 'Preview data',
        })}
      </EuiButton>

      {previewError && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut color="danger" size="s" title={previewError} announceOnMount />
        </>
      )}

      {previewData && previewRows.length === 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            size="s"
            color="warning"
            title={i18n.translate('xpack.aiPanel.editFlyout.noRows', {
              defaultMessage: 'Query returned no rows for the current time range.',
            })}
            announceOnMount
          />
        </>
      )}

      {previewData && previewRows.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiBasicTable<Record<string, unknown>>
            tableCaption={i18n.translate('xpack.aiPanel.editFlyout.previewCaption', {
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
  );
};
