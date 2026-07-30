/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableRow,
  EuiTableRowCell,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getESQLTimeField } from '@kbn/esql-utils';
import { ESQLLangEditor } from '@kbn/esql/public';
import { getServices } from '../services';
import type { EsqlDataResult } from '../utils/fetch_esql_data';

interface EsqlPreviewSectionProps {
  esqlQuery: string;
  onEsqlQueryChange: (q: string) => void;
  isPreviewLoading: boolean;
  previewData: EsqlDataResult | null;
  previewError: string | null;
  onPreview: () => void;
}

const MAX_PREVIEW_ROWS = 5;

export const EsqlPreviewSection = ({
  esqlQuery,
  onEsqlQueryChange,
  isPreviewLoading,
  previewData,
  previewError,
  onPreview,
}: EsqlPreviewSectionProps) => {
  const previewRows = previewData?.values?.slice(0, MAX_PREVIEW_ROWS) ?? [];
  const columns = previewData?.columns ?? [];

  const [detectedTimeField, setDetectedTimeField] = useState<string | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    clearTimeout(debounceRef.current);
    if (!esqlQuery.trim()) {
      setDetectedTimeField(undefined);
      return;
    }
    debounceRef.current = setTimeout(() => {
      getESQLTimeField({ query: esqlQuery, http: getServices().core.http })
        .then((field) => {
          if (!cancelled) setDetectedTimeField(field);
        })
        .catch(() => {
          if (!cancelled) setDetectedTimeField(undefined);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(debounceRef.current);
    };
  }, [esqlQuery]);

  return (
    <EuiAccordion
      id="custom-content-esql-accordion"
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="database" size="s" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>
                {i18n.translate('xpack.customContent.editFlyout.esqlSection.title', {
                  defaultMessage: 'Data source (ES|QL)',
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      extraAction={
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.customContent.editFlyout.esqlSection.optional', {
            defaultMessage: 'Optional',
          })}
        </EuiText>
      }
      paddingSize="none"
    >
      <EuiSpacer size="s" />
      <ESQLLangEditor
        query={{ esql: esqlQuery }}
        onTextLangQueryChange={(q) => onEsqlQueryChange(q.esql)}
        onTextLangQuerySubmit={async () => {}}
        editorIsInline
        hasOutline
        hideRunQueryButton
        hideQueryHistory
        disableAutoFocus
        initialState={{ editorHeight: 120 }}
        errors={[]}
      />
      {esqlQuery.trim() && detectedTimeField === undefined && (
        <>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="xs" alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="info" size="s" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.customContent.editFlyout.esqlSection.timePickerHint', {
                  defaultMessage:
                    'To connect to the dashboard time picker, add a WHERE clause with named time parameters. Example: WHERE dateField >= ?_tstart AND dateField < ?_tend',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
      <EuiSpacer size="s" />
      <EuiButton
        size="s"
        isLoading={isPreviewLoading}
        onClick={onPreview}
        disabled={!esqlQuery.trim()}
        iconType="play"
      >
        {i18n.translate('xpack.customContent.editFlyout.esqlSection.previewButton', {
          defaultMessage: 'Preview data',
        })}
      </EuiButton>

      {previewError && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            color="danger"
            size="s"
            title={i18n.translate('xpack.customContent.editFlyout.esqlSection.previewError', {
              defaultMessage: 'Preview failed',
            })}
            announceOnMount
          >
            {previewError}
          </EuiCallOut>
        </>
      )}

      {previewData && columns.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiTable tableLayout="auto" compressed>
            <EuiTableHeader>
              {columns.map((col) => (
                <EuiTableHeaderCell key={col.name}>{col.name}</EuiTableHeaderCell>
              ))}
            </EuiTableHeader>
            <EuiTableBody>
              {previewRows.map((row, rowIdx) => (
                <EuiTableRow key={rowIdx}>
                  {columns.map((col, colIdx) => (
                    <EuiTableRowCell key={col.name}>{String(row[colIdx] ?? '')}</EuiTableRowCell>
                  ))}
                </EuiTableRow>
              ))}
            </EuiTableBody>
          </EuiTable>
        </>
      )}
    </EuiAccordion>
  );
};
