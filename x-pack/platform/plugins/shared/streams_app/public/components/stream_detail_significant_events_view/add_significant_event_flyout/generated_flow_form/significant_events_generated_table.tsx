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
  EuiCodeBlock,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamQueryKql, Streams, System } from '@kbn/streams-schema';
import React, { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { PreviewDataSparkPlot } from '../common/preview_data_spark_plot';
import { validateQuery } from '../common/validate_query';
import { GeneratedEventPreview } from './generated_event_preview';
import { SeverityBadge } from '../../../significant_events_discovery/components/severity_badge/severity_badge';

interface Props {
  definition: Streams.all.Definition;
  generatedQueries: StreamQueryKql[];
  setIsEditingQueries: (isEditingQueries: boolean) => void;
  onEditQuery: (query: StreamQueryKql) => void;
  selectedQueries: StreamQueryKql[];
  isSubmitting: boolean;
  onSelectionChange: (selectedItems: StreamQueryKql[]) => void;
  systems: Omit<System, 'description'>[];
  dataViews: DataView[];
}

export function SignificantEventsGeneratedTable({
  generatedQueries,
  onEditQuery,
  setIsEditingQueries,
  selectedQueries,
  onSelectionChange,
  definition,
  isSubmitting,
  systems,
  dataViews,
}: Props) {
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );
  const [eventsInEditMode, setEventsInEditMode] = useState<string[]>([]);

  const setIsEditing = useCallback(
    (isEditing: boolean, query: StreamQueryKql) => {
      const nextEventsInEditMode = isEditing
        ? [...eventsInEditMode, query.id]
        : eventsInEditMode.filter((id) => id !== query.id);
      setEventsInEditMode(nextEventsInEditMode);
      setIsEditingQueries(nextEventsInEditMode.length > 0);
    },
    [eventsInEditMode, setIsEditingQueries]
  );

  const toggleDetails = (query: StreamQueryKql) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

    if (itemIdToExpandedRowMapValues[query.id]) {
      delete itemIdToExpandedRowMapValues[query.id];
    } else {
      itemIdToExpandedRowMapValues[query.id] = (
        <GeneratedEventPreview
          definition={definition}
          query={query}
          isEditing={eventsInEditMode.includes(query.id)}
          setIsEditing={(nextIsEditing) => setIsEditing(nextIsEditing, query)}
          onSave={onEditQuery}
          systems={systems}
          dataViews={dataViews}
        />
      );
    }

    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  useEffect(() => {
    const copy = { ...itemIdToExpandedRowMap };
    for (const queryId of Object.keys(copy)) {
      const query = generatedQueries.find((q) => q.id === queryId)!;
      copy[queryId] = (
        <GeneratedEventPreview
          definition={definition}
          query={query}
          isEditing={eventsInEditMode.includes(query.id)}
          setIsEditing={(nextIsEditing) => setIsEditing(nextIsEditing, query)}
          onSave={onEditQuery}
          systems={systems}
          dataViews={dataViews}
        />
      );
    }
    setItemIdToExpandedRowMap(copy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsInEditMode, definition, onEditQuery, systems, dataViews, generatedQueries]);

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
      width: '25%',
      name: i18n.translate('xpack.streams.addSignificantEventFlyout.aiFlow.titleColumn', {
        defaultMessage: 'Title',
      }),
      render: (_, query) => <EuiText size="s">{query.title}</EuiText>,
    },
    {
      width: '15%',
      field: 'feature',
      name: i18n.translate('xpack.streams.addSignificantEventFlyout.aiFlow.systemColumn', {
        defaultMessage: 'System',
      }),
      render: (_, item: StreamQueryKql) => {
        return <EuiBadge color="hollow">{item.feature?.name ?? '--'}</EuiBadge>;
      },
    },
    {
      width: '30%',
      field: 'kql',
      name: i18n.translate('xpack.streams.addSignificantEventFlyout.aiFlow.queryColumn', {
        defaultMessage: 'Query',
      }),
      render: (_, item: StreamQueryKql) => {
        return <EuiCodeBlock paddingSize="none">{JSON.stringify(item.kql?.query)}</EuiCodeBlock>;
      },
    },
    {
      width: '10%',
      field: 'severity_score',
      name: i18n.translate('xpack.streams.addSignificantEventFlyout.aiFlow.severityScoreColumn', {
        defaultMessage: 'Severity',
      }),
      render: (score: number) => {
        return <SeverityBadge score={score} />;
      },
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
            hideAxis={true}
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
