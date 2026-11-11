/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiCallOut,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { ImportFieldMapping, ImportRow } from './lib';
import { hasValidMapping } from './reducer';
import * as translations from './translations';

const formatPreviewValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (value === undefined) {
    return '';
  }
  return JSON.stringify(value);
};

interface MapStepProps {
  columns: string[];
  rows: ImportRow[];
  mapping: ImportFieldMapping;
  onMappingChange: (column: string, destination: ImportFieldMapping[string]) => void;
}

export const MapStep = ({ columns, rows, mapping, onMappingChange }: MapStepProps) => {
  const previewColumns: Array<EuiBasicTableColumn<ImportRow>> = [
    {
      field: 'rowNumber',
      name: translations.ROW_NUMBER_LABEL,
      width: '80px',
      valign: 'top',
    },
    ...columns.map(
      (column): EuiBasicTableColumn<ImportRow> => ({
        field: 'values',
        name: column,
        valign: 'top',
        render: (values: ImportRow['values']) => formatPreviewValue(values[column]),
      })
    ),
  ];

  return (
    <>
      <EuiText size="s">
        <p>{translations.MAPPING_DESCRIPTION}</p>
      </EuiText>
      {!hasValidMapping(mapping) ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            color="warning"
            title={translations.INVALID_MAPPING_ERROR}
            size="s"
          />
        </>
      ) : null}
      <EuiSpacer size="m" />
      <EuiBasicTable
        tableCaption={translations.MAPPING_TABLE_LABEL}
        items={columns.map((column) => ({ column }))}
        columns={[
          { field: 'column', name: translations.SOURCE_COLUMN_LABEL },
          {
            field: 'column',
            name: translations.DESTINATION_FIELD_LABEL,
            render: (column: string) => (
              <EuiSelect
                aria-label={translations.getMappingAriaLabel(column)}
                value={mapping[column]}
                options={[
                  { value: 'input', text: translations.INPUT_OPTION_LABEL },
                  { value: 'output', text: translations.OUTPUT_OPTION_LABEL },
                  { value: 'metadata', text: translations.METADATA_OPTION_LABEL },
                  { value: 'ignore', text: translations.IGNORE_OPTION_LABEL },
                ]}
                onChange={(event) =>
                  onMappingChange(column, event.target.value as ImportFieldMapping[string])
                }
              />
            ),
          },
        ]}
      />
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h3>{translations.PREVIEW_TITLE}</h3>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>{translations.PREVIEW_DESCRIPTION}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <div css={{ overflowX: 'auto' }}>
        <EuiBasicTable
          tableCaption={translations.PREVIEW_TABLE_LABEL}
          items={rows}
          columns={previewColumns}
        />
      </div>
    </>
  );
};
