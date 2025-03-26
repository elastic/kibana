/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiCheckbox,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StreamQueryKql } from '@kbn/streams-schema';
import React, { useState } from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useTimefilter } from '../../../hooks/use_timefilter';
import { SparkPlot } from '../../spark_plot';
import { StreamsAppSearchBar } from '../../streams_app_search_bar';
import { useSignificantEventSuggestionPreviews } from './use_suggestion_preview';

export function SignificantEventSuggestionsList({
  name,
  suggestions,
  onSuggestionClick,
  selected,
}: {
  name: string;
  suggestions: StreamQueryKql[];
  onSuggestionClick?: (suggestion: StreamQueryKql) => void;
  selected: StreamQueryKql[];
}) {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();

  const { timeRange: initialTimeRange } = useTimefilter();

  const [timeRange, setTimeRange] = useState(initialTimeRange);

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
      <EuiFlexGroup direction="column">
        {suggestionsWithSparkplots.map(({ suggestion, timeseries, annotations, empty }) => {
          const isSelected = selected.includes(suggestion);
          return (
            <EuiFlexGroup
              direction="row"
              alignItems="center"
              key={suggestion.id}
              onClick={() => {
                onSuggestionClick?.(suggestion);
              }}
            >
              <EuiFlexItem>
                <EuiCheckbox
                  id={suggestion.id}
                  onChange={() => {
                    onSuggestionClick?.(suggestion);
                  }}
                  checked={isSelected}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs">{suggestion.title}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow>
                <EuiCode language="kql">{suggestion.kql.query}</EuiCode>
              </EuiFlexItem>

              <EuiFlexItem>
                {timeseries && annotations ? (
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
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        })}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
