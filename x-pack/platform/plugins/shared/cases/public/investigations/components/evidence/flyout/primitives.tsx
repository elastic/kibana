/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBasicTable,
  EuiButtonGroup,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from '../translations';

export const DetailSection: React.FC<{
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  'data-test-subj'?: string;
}> = ({ title, children, actions, 'data-test-subj': dataTestSubj }) => (
  <section data-test-subj={dataTestSubj}>
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h3>{title}</h3>
        </EuiTitle>
      </EuiFlexItem>
      {actions ? <EuiFlexItem grow={false}>{actions}</EuiFlexItem> : null}
    </EuiFlexGroup>
    <EuiSpacer size="s" />
    {children}
    <EuiSpacer size="l" />
  </section>
);
DetailSection.displayName = 'DetailSection';

/** A two-column list of name and value pairs such as `[['host.name', 'edge-01']]`. */
export const PairsList: React.FC<{
  pairs: Array<[string, string]>;
  'data-test-subj'?: string;
}> = ({ pairs, 'data-test-subj': dataTestSubj }) => (
  <EuiDescriptionList
    type="column"
    compressed
    columnWidths={[1, 2]}
    listItems={pairs.map(([title, description]) => ({
      title,
      description: (
        <span
          css={css`
            overflow-wrap: anywhere;
          `}
        >
          {description}
        </span>
      ),
    }))}
    data-test-subj={dataTestSubj}
  />
);
PairsList.displayName = 'PairsList';

interface DataRow {
  id: number;
  cells: string[];
}

/** A small table of string cells, such as query results or the checks behind a finding. */
export const DataTable: React.FC<{
  columns: string[];
  rows: string[][];
  caption: string;
  'data-test-subj'?: string;
}> = ({ columns, rows, caption, 'data-test-subj': dataTestSubj }) => {
  const tableColumns = useMemo<Array<EuiBasicTableColumn<DataRow>>>(
    () =>
      columns.map((name, index) => ({
        field: 'cells',
        name,
        render: (cells: string[]) => cells[index] ?? '',
      })),
    [columns]
  );
  const items = useMemo<DataRow[]>(() => rows.map((cells, id) => ({ id, cells })), [rows]);

  return (
    <EuiBasicTable<DataRow>
      tableCaption={caption}
      items={items}
      itemId="id"
      columns={tableColumns}
      noItemsMessage={i18n.NO_ROWS}
      tableLayout="auto"
      data-test-subj={dataTestSubj}
    />
  );
};
DataTable.displayName = 'DataTable';

const setPath = (target: Record<string, unknown>, path: string, value: string): void => {
  const keys = path.split('.');
  let current = target;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      current[key] = value;
      return;
    }
    const next = current[key];
    if (typeof next === 'object' && next !== null) {
      current = next as Record<string, unknown>;
    } else {
      const created: Record<string, unknown> = {};
      current[key] = created;
      current = created;
    }
  });
};

/** Turns dotted field names into nested JSON. */
export const nestPairs = (pairs: Array<[string, string]>): Record<string, unknown> => {
  const nested: Record<string, unknown> = {};
  pairs.forEach(([path, value]) => setPath(nested, path, value));
  return nested;
};

export type DocumentView = 'table' | 'json';

/** The fields of an alert or event with a Table / JSON switch whose choice is kept by the caller. */
export const DocumentFields: React.FC<{
  pairs: Array<[string, string]>;
  view: DocumentView;
  onViewChange: (view: DocumentView) => void;
  title: string;
}> = ({ pairs, view, onViewChange, title }) => (
  <DetailSection
    title={title}
    data-test-subj="investigationEvidenceDocument"
    actions={
      <EuiButtonGroup
        legend={i18n.DOCUMENT_VIEW}
        buttonSize="compressed"
        options={[
          {
            id: 'investigationEvidenceDocumentView-table',
            label: i18n.VIEW_TABLE,
            'data-test-subj': 'investigationEvidenceDocumentView-table',
          },
          {
            id: 'investigationEvidenceDocumentView-json',
            label: i18n.VIEW_JSON,
            'data-test-subj': 'investigationEvidenceDocumentView-json',
          },
        ]}
        idSelected={`investigationEvidenceDocumentView-${view}`}
        onChange={(id) => onViewChange(id.endsWith('json') ? 'json' : 'table')}
      />
    }
  >
    {pairs.length === 0 ? (
      <EuiText size="s" color="subdued">
        {i18n.NO_FIELDS}
      </EuiText>
    ) : view === 'json' ? (
      <EuiCodeBlock language="json" fontSize="s" paddingSize="m" isCopyable overflowHeight={360}>
        {JSON.stringify(nestPairs(pairs), null, 2)}
      </EuiCodeBlock>
    ) : (
      <PairsList pairs={pairs} />
    )}
  </DetailSection>
);
DocumentFields.displayName = 'DocumentFields';
