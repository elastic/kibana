/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ImportIndicatorsResponse } from '../../../../../common/investigations/types';
import { ICONS } from '../../../icons';
import * as i18n from '../translations';

const MAX_SHOWN_ERRORS = 50;

export interface CsvSource {
  /** The CSV text, either pasted or read from the chosen file. */
  text: string;
  /** Set when the text came from a file. */
  fileName?: string;
  bytes: number;
  rows: number;
}

export const countCsvRows = (text: string): number => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return Math.max(lines.length - 1, 0);
};

export interface ImportCsvFieldsProps {
  source: CsvSource;
  onTextChange: (text: string) => void;
  onFile: (file: File | undefined) => void;
  onClearFile: () => void;
  error?: string;
  result: ImportIndicatorsResponse | null;
}

const errorColumns: Array<EuiBasicTableColumn<{ line: number; message: string }>> = [
  { field: 'line', name: i18n.IMPORT_ERROR_LINE, width: '80px' },
  { field: 'message', name: i18n.IMPORT_ERROR_MESSAGE },
];

export const ImportCsvFields: React.FC<ImportCsvFieldsProps> = ({
  source,
  onTextChange,
  onFile,
  onClearFile,
  error,
  result,
}) => {
  const { euiTheme } = useEuiTheme();

  if (result) {
    const shown = result.errors.slice(0, MAX_SHOWN_ERRORS);
    return (
      <div data-test-subj="investigationEvidenceImportResult">
        <EuiCallOut
          announceOnMount
          size="s"
          color={result.created > 0 ? 'success' : 'warning'}
          iconType={result.created > 0 ? ICONS.check : ICONS.warning}
          title={i18n.IMPORT_CREATED(result.created)}
        >
          <ul>
            <li data-test-subj="investigationEvidenceImportCreated">
              {i18n.IMPORT_CREATED_COUNT(result.created)}
            </li>
            <li data-test-subj="investigationEvidenceImportDuplicates">
              {i18n.IMPORT_DUPLICATES(result.skipped_duplicates)}
            </li>
            <li data-test-subj="investigationEvidenceImportErrors">
              {i18n.IMPORT_ERRORS(result.errors.length)}
            </li>
          </ul>
        </EuiCallOut>
        {shown.length > 0 ? (
          <>
            <EuiSpacer size="m" />
            <EuiBasicTable
              tableCaption={i18n.IMPORT_ERRORS_CAPTION}
              items={shown}
              itemId="line"
              columns={errorColumns}
              data-test-subj="investigationEvidenceImportErrorTable"
            />
            {result.errors.length > shown.length ? (
              <EuiText size="xs" color="subdued">
                {i18n.IMPORT_MORE_ERRORS(result.errors.length - shown.length)}
              </EuiText>
            ) : null}
          </>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <EuiText size="s" color="subdued">
        <p>{i18n.IMPORT_INTRO}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.IMPORT_FILE_LABEL}
        helpText={i18n.IMPORT_FILE_HELP}
        isInvalid={Boolean(error)}
        error={error}
        fullWidth
      >
        {source.fileName ? (
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            responsive={false}
            css={css`
              padding: ${euiTheme.size.s};
              border: ${euiTheme.border.thin};
              border-radius: ${euiTheme.border.radius.medium};
            `}
            data-test-subj="investigationEvidenceImportFile"
          >
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{source.fileName}</strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                {i18n.IMPORT_FILE_SUMMARY(
                  source.rows,
                  Math.max(1, Math.round(source.bytes / 1024))
                )}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                onClick={onClearFile}
                data-test-subj="investigationEvidenceImportClearFile"
              >
                {i18n.IMPORT_REMOVE_FILE}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiFilePicker
            fullWidth
            accept=".csv,.txt,text/csv,text/plain"
            initialPromptText={i18n.IMPORT_FILE_PROMPT}
            onChange={(files) => onFile(files?.item(0) ?? undefined)}
            display="default"
            data-test-subj="investigationEvidenceImportFilePicker"
          />
        )}
      </EuiFormRow>
      {source.fileName ? null : (
        <EuiFormRow label={i18n.IMPORT_PASTE_LABEL} fullWidth>
          <EuiTextArea
            fullWidth
            rows={6}
            value={source.text}
            placeholder={i18n.IMPORT_PASTE_PLACEHOLDER}
            onChange={(event) => onTextChange(event.target.value)}
            css={css`
              font-family: ${euiTheme.font.familyCode};
            `}
            data-test-subj="investigationEvidenceImportText"
          />
        </EuiFormRow>
      )}
    </>
  );
};
ImportCsvFields.displayName = 'ImportCsvFields';
