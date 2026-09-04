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
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { getESQLTimeField } from '@kbn/esql-utils';
import { ESQLLangEditor } from '@kbn/esql/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { getServices } from '../services';
import type { EsqlDataResult } from '../utils/fetch_esql_data';

interface EsqlPreviewSectionProps {
  esqlQuery: string;
  onEsqlQueryChange: (q: string) => void;
  isDataLoading: boolean;
  esqlData: EsqlDataResult | null;
  esqlDataError: string | null;
  onFetchData: () => void;
  esqlVariables?: ESQLControlVariable[];
}

const MAX_PREVIEW_ROWS = 5;
/**
 * This table shows the shape of the data, not its content — a markdown or multivalue column can
 * carry kilobytes per cell, which stretches the table in both axes and buries the column names.
 */
const MAX_PREVIEW_CELL_CHARS = 120;

// Fixed layout gives every column an equal share, so one long column cannot starve the rest.
// Values are clipped to one line — they are only a sample of the shape — but names are what the
// template references as row["name"], so headers wrap rather than hide behind a hover.
const previewTableCss = css({
  // `anywhere`, not `break-word`: only `anywhere` shrinks the flex item EUI wraps cell text in.
  th: {
    overflowWrap: 'anywhere',
  },
});

const formatCell = (value: unknown): { text: string; full: string } => {
  const full = Array.isArray(value) ? value.join(', ') : String(value ?? '');
  return {
    text: full.length > MAX_PREVIEW_CELL_CHARS ? `${full.slice(0, MAX_PREVIEW_CELL_CHARS)}…` : full,
    full,
  };
};

/** `isPending` keeps the "no time field" hint hidden until detection actually resolves. */
interface TimeFieldDetection {
  isPending: boolean;
  field: string | undefined;
}

const detectTimeField = (
  query: string,
  setState: React.Dispatch<React.SetStateAction<TimeFieldDetection>>
) => {
  let cancelled = false;
  setState({ isPending: true, field: undefined });
  getESQLTimeField({ query, http: getServices().core.http })
    .then((field) => {
      if (!cancelled) setState({ isPending: false, field });
    })
    .catch(() => {
      if (!cancelled) setState({ isPending: false, field: undefined });
    });
  return () => {
    cancelled = true;
  };
};

export const EsqlPreviewSection = ({
  esqlQuery,
  onEsqlQueryChange,
  isDataLoading,
  esqlData,
  esqlDataError,
  onFetchData,
  esqlVariables,
}: EsqlPreviewSectionProps) => {
  const previewRows = esqlData?.values?.slice(0, MAX_PREVIEW_ROWS) ?? [];
  const columns = esqlData?.columns ?? [];

  const [timeFieldDetection, setTimeFieldDetection] = useState<TimeFieldDetection>({
    isPending: Boolean(esqlQuery.trim()),
    field: undefined,
  });
  const initialQueryRef = useRef(esqlQuery);
  const accordionId = useGeneratedHtmlId({ prefix: 'customContentEsql' });

  useEffect(() => {
    const query = initialQueryRef.current;
    return query.trim() ? detectTimeField(query, setTimeFieldDetection) : undefined;
  }, []);

  const handleFetchData = () => {
    if (esqlQuery.trim()) detectTimeField(esqlQuery, setTimeFieldDetection);
    onFetchData();
  };

  return (
    <EuiAccordion
      id={accordionId}
      data-test-subj="customContentEsqlSection"
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
        esqlVariables={esqlVariables}
      />
      {esqlQuery.trim() && !timeFieldDetection.isPending && !timeFieldDetection.field && (
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
                    'To connect the query to the dashboard time filter, add a WHERE clause with the named time parameters. Example: WHERE dateField >= ?_tstart AND dateField < ?_tend',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
      <EuiSpacer size="s" />
      <EuiButton
        size="s"
        isLoading={isDataLoading}
        onClick={handleFetchData}
        disabled={!esqlQuery.trim()}
        iconType="play"
        data-test-subj="customContentPreviewDataButton"
      >
        {i18n.translate('xpack.customContent.editFlyout.esqlSection.previewButton', {
          defaultMessage: 'Preview data',
        })}
      </EuiButton>

      {esqlDataError && (
        <>
          <EuiSpacer size="s" />
          <KbnDangerCallout
            title={i18n.translate('xpack.customContent.editFlyout.esqlSection.previewError', {
              defaultMessage: 'Preview failed',
            })}
          >
            {esqlDataError}
          </KbnDangerCallout>
        </>
      )}

      {esqlData && columns.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiTable tableLayout="fixed" compressed css={previewTableCss}>
            <EuiTableHeader>
              {columns.map((col) => (
                <EuiTableHeaderCell key={col.name} title={col.name}>
                  {col.name}
                </EuiTableHeaderCell>
              ))}
            </EuiTableHeader>
            <EuiTableBody>
              {previewRows.map((row, rowIdx) => (
                <EuiTableRow key={rowIdx}>
                  {columns.map((col, colIdx) => {
                    const { text, full } = formatCell(row[colIdx]);
                    return (
                      <EuiTableRowCell key={col.name} title={full} truncateText>
                        {text}
                      </EuiTableRowCell>
                    );
                  })}
                </EuiTableRow>
              ))}
            </EuiTableBody>
          </EuiTable>
        </>
      )}
    </EuiAccordion>
  );
};
