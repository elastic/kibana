/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiScreenReaderOnly,
  EuiText,
  type EuiBasicTableColumn,
  type EuiTableSelectionType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamQueryKql, Streams, System } from '@kbn/streams-schema';
import React, { useState, type ReactNode } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { PreviewDataSparkPlot } from '../common/preview_data_spark_plot';
import { validateQuery } from '../common/validate_query';
import { GeneratedEventPreview } from './generated_event_preview';

interface Props {
  definition: Streams.all.Definition;
  generatedQueries: StreamQueryKql[];
  onEditQuery: (query: StreamQueryKql) => void;
  selectedQueries: StreamQueryKql[];
  isSubmitting: boolean;
  onSelectionChange: (selectedItems: StreamQueryKql[]) => void;
  isGenerating: boolean;
  systems: Omit<System, 'description'>[];
  dataViews: DataView[];
}

export function SignificantEventsGeneratedTable({
  generatedQueries,
  onEditQuery,
  selectedQueries,
  onSelectionChange,
  definition,
  isSubmitting,
  isGenerating,
  systems,
  dataViews,
}: Props) {
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );

  const toggleDetails = (query: StreamQueryKql) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

    if (itemIdToExpandedRowMapValues[query.id]) {
      delete itemIdToExpandedRowMapValues[query.id];
    } else {
      const validation = validateQuery(query);
      itemIdToExpandedRowMapValues[query.id] = (
        <GeneratedEventPreview
          definition={definition}
          query={query}
          validation={validation}
          onSave={onEditQuery}
          isGenerating={isGenerating}
          systems={systems}
          dataViews={dataViews}
        />
      );
    }

    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  const columns: Array<EuiBasicTableColumn<StreamQueryKql>> = [
    {
      align: 'right',
      width: '40px',
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>
            {i18n.translate('xpack.streams.addSignificantEventFlyout.aiFlow.previewToggleColumn', {
              defaultMessage: 'Preview toggle',
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
    {
      field: 'title',
      width: '60%',
      name: i18n.translate('xpack.streams.addSignificantEventFlyout.aiFlow.titleColumn', {
        defaultMessage: 'Title',
      }),
      render: (_, query) => <EuiText>{query.title}</EuiText>,
    },
    {
      width: '20%',
      field: 'system',
      name: i18n.translate('xpack.streams.addSignificantEventFlyout.aiFlow.systemColumn', {
        defaultMessage: 'System',
      }),
      render: (_, item: StreamQueryKql) => <EuiBadge color="hollow">{item.system?.name}</EuiBadge>,
    },
    {
      name: (
        <EuiScreenReaderOnly>
          <span>
            {i18n.translate('xpack.streams.addSignificantEventFlyout.aiFlow.dataColumn', {
              defaultMessage: 'Data preview',
            })}
          </span>
        </EuiScreenReaderOnly>
      ),
      width: '20%',
      render: (query: StreamQueryKql) => {
        const validation = validateQuery(query);
        return (
          <PreviewDataSparkPlot
            definition={definition}
            query={query}
            isQueryValid={!validation.kql.isInvalid}
            showTitle={false}
            compressed={true}
            hideXAxis={true}
            height={40}
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
      tableLayout="auto"
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
