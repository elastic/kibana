/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiInMemoryTable,
  EuiLink,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { StreamsListTableTools } from './streams_list_table_tools';
import { SourceFlyout } from './source_flyout';
import { STREAMS_TABLE_SEARCH_ARIA_LABEL } from './translations';

interface SourceRow {
  name: string;
}

/**
 * Demo-only mock sources. The real columns for Sources are not decided yet, so
 * the table shows real-looking source names plus placeholder columns.
 */
const SOURCE_ROWS: SourceRow[] = [
  { name: 'AWS CloudWatch' },
  { name: 'Azure Monitor' },
  { name: 'Google Cloud Logging' },
  { name: 'Kafka' },
  { name: 'Filebeat' },
];

const PLACEHOLDER_LABEL = i18n.translate('xpack.streams.sourcesTable.placeholderLabel', {
  defaultMessage: 'Placeholder',
});

export function SourcesTable() {
  const [selectedSource, setSelectedSource] = useState<string | undefined>();

  const columns: Array<EuiBasicTableColumn<SourceRow>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.streams.sourcesTable.nameColumn', {
        defaultMessage: 'Name',
      }),
      render: (name: string) => (
        <EuiLink
          href="#"
          data-test-subj={`sourceNameLink-${name}`}
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            setSelectedSource(name);
          }}
        >
          {name}
        </EuiLink>
      ),
    },
    {
      field: 'placeholder1',
      name: PLACEHOLDER_LABEL,
      render: () => <EuiText size="s">{PLACEHOLDER_LABEL}</EuiText>,
    },
    {
      field: 'placeholder2',
      name: PLACEHOLDER_LABEL,
      render: () => <EuiText size="s">{PLACEHOLDER_LABEL}</EuiText>,
    },
    {
      field: 'placeholder3',
      name: PLACEHOLDER_LABEL,
      render: () => <EuiText size="s">{PLACEHOLDER_LABEL}</EuiText>,
    },
  ];

  return (
    <>
      <EuiInMemoryTable<SourceRow>
        tableCaption={i18n.translate('xpack.streams.sourcesTable.tableCaption', {
          defaultMessage: 'Sources table',
        })}
        data-test-subj="sourcesTable"
        items={SOURCE_ROWS}
        columns={columns}
        search={{
          box: {
            incremental: true,
            compressed: true,
            'aria-label': STREAMS_TABLE_SEARCH_ARIA_LABEL,
          },
          toolsRight: (
            <StreamsListTableTools
              newButtonLabel={i18n.translate('xpack.streams.sourcesTable.newButtonLabel', {
                defaultMessage: 'New source',
              })}
            />
          ),
        }}
      />
      {selectedSource && (
        <SourceFlyout
          sourceName={selectedSource}
          onClose={() => setSelectedSource(undefined)}
        />
      )}
    </>
  );
}
