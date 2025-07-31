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
import { useKibana } from '../../../../hooks/use_kibana';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { buildDiscoverParams } from '../../utils/discover_helpers';

interface Props {
  definition: Streams.all.Definition;
  generatedQueries: StreamQueryKql[];
  selectedQueries: StreamQueryKql[];
  isSubmitting: boolean;
  onSelectionChange: (selectedItems: StreamQueryKql[]) => void;
}

export function SignificantEventsGeneratedTable({
  generatedQueries,
  selectedQueries,
  onSelectionChange,
  definition,
  isSubmitting,
}: Props) {
  const {
    dependencies: {
      start: { discover },
    },
  } = useKibana();
  const { timeState } = useTimefilter();

  const columns: Array<EuiBasicTableColumn<StreamQueryKql>> = [
    {
      field: 'title',
      name: i18n.translate('xpack.streams.addSignificantEventFlyout.aiFlow.titleColumn', {
        defaultMessage: 'Title',
      }),
      render: (_, query) => (
        <EuiLink
          target="_blank"
          href={discover?.locator?.getRedirectUrl(
            buildDiscoverParams(query, definition, timeState)
          )}
        >
          {query.title}
        </EuiLink>
      ),
    },
    {
      field: 'kql',
      name: i18n.translate('xpack.streams.addSignificantEventFlyout.aiFlow.queryColumn', {
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
    selectable: () => !isSubmitting,
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
        'xpack.streams.addSignificantEventFlyout.aiFlow.noQueriesMessage',
        { defaultMessage: 'No significant events queries generated' }
      )}
    />
  );
}
