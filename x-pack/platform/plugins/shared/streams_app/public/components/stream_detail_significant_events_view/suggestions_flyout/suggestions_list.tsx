/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { niceTimeFormatter } from '@elastic/charts';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiCode,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiScreenReaderOnly,
  EuiText,
} from '@elastic/eui';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import { StreamQueryKql } from '@kbn/streams-schema';
import { compact, without } from 'lodash';
import React, { useMemo, useState } from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useTimefilter } from '../../../hooks/use_timefilter';
import { SparkPlot } from '../../spark_plot';
import { StreamsAppSearchBar } from '../../streams_app_search_bar';
import { ChangePointSummary } from '../change_point_summary';
import {
  SignificantEventSuggestionPreview,
  useSignificantEventSuggestionPreviews,
} from './use_suggestion_preview';

export function SignificantEventSuggestionsList({
  name,
  suggestions,
  onSelectionChange,
  selected,
}: {
  name: string;
  suggestions: StreamQueryKql[];
  onSelectionChange?: (ids: string[]) => void;
  selected: string[];
}) {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();

  const { timeRange: initialTimeRange } = useTimefilter();

  const [timeRange, setTimeRange] = useState(initialTimeRange);

  const [expanded, setExpanded] = useState<string[]>([]);

  const dataViewsFetch = useStreamsAppFetch(() => {
    return data.dataViews
      .create({
        title: name,
      })
      .then((value) => {
        return [value];
      });
  }, [data.dataViews, name]);

  const suggestionsWithSparkplots = useSignificantEventSuggestionPreviews({
    name,
    suggestions,
    timeRange,
  });

  const itemIdToExpandedRowMap = useMemo(() => {
    return Object.fromEntries(
      compact(
        suggestionsWithSparkplots.map((item) =>
          expanded?.includes(item.suggestion.id)
            ? [item.suggestion.id, <EuiCode language="kql">{item.suggestion.kql.query}</EuiCode>]
            : undefined
        )
      )
    );
  }, [suggestionsWithSparkplots, expanded]);

  const xFormatter = useMemo(() => {
    const absoluteTimerange = getAbsoluteTimeRange(timeRange);

    return niceTimeFormatter([
      new Date(absoluteTimerange.from).getTime(),
      new Date(absoluteTimerange.to).getTime(),
    ]);
  }, [timeRange]);

  const selectedItems = useMemo(() => {
    const suggestionsById = new Map(
      suggestionsWithSparkplots.map((item) => [item.suggestion.id, item])
    );
    return compact(
      selected.map((id) => {
        return suggestionsById.get(id);
      })
    );
  }, [suggestionsWithSparkplots, selected]);

  const columns = useMemo((): Array<EuiBasicTableColumn<SignificantEventSuggestionPreview>> => {
    return [
      {
        field: 'title',
        name: i18n.translate('xpack.streams.significantEventSuggestionFlyout.titleColumnTitle', {
          defaultMessage: 'Title',
        }),
        render: (_, { suggestion }) => {
          return <EuiText size="xs">{suggestion.title}</EuiText>;
        },
      },
      {
        field: 'change',
        name: i18n.translate('xpack.streams.significantEventSuggestionFlyout.changeColumnTitle', {
          defaultMessage: 'Change',
        }),
        render: (_, { change }) => {
          return <ChangePointSummary change={change} xFormatter={xFormatter} />;
        },
      },
      {
        field: 'trend',
        name: i18n.translate('xpack.streams.significantEventSuggestionFlyout.trendColumnTitle', {
          defaultMessage: 'Trend',
        }),
        render: (_, { timeseries, annotations, suggestion, empty }) => {
          return timeseries && annotations ? (
            <SparkPlot
              key={suggestion.id}
              id={`query_preview_${suggestion.id}`}
              name={i18n.translate('xpack.significantEventFlyout.previewChartSeriesName', {
                defaultMessage: `Count`,
              })}
              timeseries={empty ? [] : timeseries}
              type="bar"
              annotations={annotations}
            />
          ) : (
            <EuiLoadingSpinner />
          );
        },
      },
      {
        isExpander: true,
        name: (
          <EuiScreenReaderOnly>
            <span>
              {i18n.translate('xpack.streams.significantEventSuggestionFlyout.expandActionLabel', {
                defaultMessage: 'Expand',
              })}
            </span>
          </EuiScreenReaderOnly>
        ),
        width: '64px',
        render: ({ suggestion }: SignificantEventSuggestionPreview) => {
          return (
            <EuiButtonIcon
              onClick={() => {
                setExpanded((prev) =>
                  prev.includes(suggestion.id)
                    ? without(prev, suggestion.id)
                    : prev.concat(suggestion.id)
                );
              }}
              aria-label={itemIdToExpandedRowMap[suggestion.id] ? 'Collapse' : 'Expand'}
              iconType={itemIdToExpandedRowMap[suggestion.id] ? 'arrowUp' : 'arrowDown'}
            />
          );
        },
      },
    ];
  }, [xFormatter, itemIdToExpandedRowMap]);

  return (
    <EuiFlexGroup direction="column">
      <StreamsAppSearchBar
        onQuerySubmit={(next) => {
          if (next.dateRange) {
            setTimeRange(next.dateRange);
          }
        }}
        dateRangeFrom={timeRange.from}
        dateRangeTo={timeRange.to}
        placeholder={i18n.translate('xpack.significantEventSuggestionFlyout.queryPlaceholder', {
          defaultMessage: 'Filter events',
        })}
        dataViews={dataViewsFetch.value}
      />
      <EuiBasicTable
        items={suggestionsWithSparkplots}
        columns={columns}
        compressed
        selection={{
          selected: selectedItems,
          onSelectionChange: (next: SignificantEventSuggestionPreview[]) => {
            onSelectionChange?.(next.map((item) => item.suggestion.id));
          },
        }}
        itemId={(item) => item.suggestion.id}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      />
    </EuiFlexGroup>
  );
}
