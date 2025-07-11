/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiCodeBlock,
  EuiLink,
  type EuiBasicTableColumn,
  type EuiTableSelectionType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamQueryKql, Streams } from '@kbn/streams-schema';
import React from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { buildDiscoverParams } from '../utils/discover_helpers';

export function SignificantEventsGeneratedTable({
  generatedQueries,
  selectedQueries,
  onSelectionChange,
  definition,
}: {
  generatedQueries: StreamQueryKql[];
  selectedQueries: StreamQueryKql[];
  onSelectionChange: (selectedItems: StreamQueryKql[]) => void;
  definition: Streams.all.Definition;
}) {
  const {
    dependencies: {
      start: { discover },
    },
  } = useKibana();

  const columns: Array<EuiBasicTableColumn<StreamQueryKql>> = [
    {
      field: 'title',
      name: i18n.translate('xpack.streams.streamDetailView.generateSignificantEvents.titleColumn', {
        defaultMessage: 'Title',
      }),
      render: (_, query) => (
        <EuiLink
          target="_blank"
          href={discover?.locator?.getRedirectUrl(buildDiscoverParams(query, definition))}
        >
          {query.title}
        </EuiLink>
      ),
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
