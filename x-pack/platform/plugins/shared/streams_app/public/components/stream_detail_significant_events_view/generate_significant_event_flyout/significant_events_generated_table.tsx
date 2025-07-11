/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiCodeBlock,
  type EuiBasicTableColumn,
  type EuiTableSelectionType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamQueryKql } from '@kbn/streams-schema';
import React from 'react';

export function SignificantEventsGeneratedTable({
  generatedQueries,
  selectedQueries,
  onSelectionChange,
}: {
  generatedQueries: StreamQueryKql[];
  selectedQueries: StreamQueryKql[];
  onSelectionChange: (selectedItems: StreamQueryKql[]) => void;
}) {
  const columns: Array<EuiBasicTableColumn<StreamQueryKql>> = [
    {
      field: 'title',
      name: i18n.translate('xpack.streams.streamDetailView.generateSignificantEvents.titleColumn', {
        defaultMessage: 'Title',
      }),
    },
    {
      field: 'kql',
      name: i18n.translate('xpack.streams.streamDetailView.generateSignificantEvents.queryColumn', {
        defaultMessage: 'Query',
      }),
      render: (_, item: StreamQueryKql) => (
        <EuiCodeBlock paddingSize="s" fontSize="s">
          {item.kql.query}
        </EuiCodeBlock>
      ),
    },
  ];

  const selection: EuiTableSelectionType<StreamQueryKql> = {
    onSelectionChange,
    selected: selectedQueries,
  };

  return (
    <EuiBasicTable
      responsiveBreakpoint={false}
      items={generatedQueries}
      itemId="id"
      rowHeader="title"
      columns={columns}
      selection={selection}
      noItemsMessage={i18n.translate(
        'xpack.streams.streamDetailView.generateSignificantEvents.noQueriesMessage',
        { defaultMessage: 'No significant events queries generated' }
      )}
    />
  );
}
