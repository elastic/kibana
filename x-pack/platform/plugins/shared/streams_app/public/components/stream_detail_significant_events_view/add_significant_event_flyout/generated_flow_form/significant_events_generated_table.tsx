/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiLink,
  EuiScreenReaderOnly,
  type EuiBasicTableColumn,
  type EuiTableSelectionType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamQueryKql, Streams } from '@kbn/streams-schema';
import React, { useState, type ReactNode } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { buildDiscoverParams } from '../../utils/discover_helpers';
import { PreviewDataSparkPlot } from '../common/preview_data_spark_plot';
import { validateQuery } from '../common/validate_query';

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

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );

  const toggleDetails = (query: StreamQueryKql) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
    const validation = validateQuery(query);

    if (itemIdToExpandedRowMapValues[query.id]) {
      delete itemIdToExpandedRowMapValues[query.id];
    } else {
      itemIdToExpandedRowMapValues[query.id] = (
        <PreviewDataSparkPlot
          definition={definition}
          query={query}
          timeRange={timeState.timeRange}
          isQueryValid={!validation.kql.isInvalid}
        />
      );
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

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
    {
      align: 'right',
      width: '40px',
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>
            {i18n.translate('xpack.streams.addSignificantEventFlyout.aiFlow.dataColumn', {
              defaultMessage: 'Preview',
            })}
          </span>
        </EuiScreenReaderOnly>
      ),
      mobileOptions: { header: false },
      render: (query: StreamQueryKql) => {
        const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

        return (
          <EuiButtonIcon
            onClick={() => toggleDetails(query)}
            aria-label={itemIdToExpandedRowMapValues[query.id] ? 'Collapse' : 'Expand'}
            iconType={itemIdToExpandedRowMapValues[query.id] ? 'arrowDown' : 'arrowRight'}
          />
        );
      },
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
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
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
