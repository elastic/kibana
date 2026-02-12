/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  formatNumber,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { Streams, getDiscoverEsqlQuery, getIndexPatternsForStream } from '@kbn/streams-schema';
import { computeInterval } from '@kbn/visualization-utils';
import type { DurationInputArg1, DurationInputArg2 } from 'moment';
import moment from 'moment';
import { useKibana } from '../../../hooks/use_kibana';
import { ControlledEsqlChart } from '../../esql_chart/controlled_esql_chart';
import { StreamsAppSearchBar } from '../../streams_app_search_bar';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useTimefilter } from '../../../hooks/use_timefilter';
import { executeEsqlQuery } from '../../../hooks/use_execute_esql_query';

interface StreamChartPanelProps {
  definition: Streams.ingest.all.GetResponse;
}

export function StreamChartPanel({ definition }: StreamChartPanelProps) {
  const {
    dependencies: {
      start: { data, dataViews, share, streams },
    },
    core: { uiSettings },
  } = useKibana();
  const { streamsRepositoryClient } = streams;

  const { timeState } = useTimefilter();

  const indexPatterns = useMemo(() => {
    return getIndexPatternsForStream(definition.stream);
  }, [definition]);

  const discoverLocator = useMemo(
    () => share.url.locators.get('DISCOVER_APP_LOCATOR'),
    [share.url.locators]
  );

  const bucketSize = useMemo(
    () => computeInterval(timeState.asAbsoluteTimeRange, data),
    [data, timeState.asAbsoluteTimeRange]
  );

  const queries = useMemo(() => {
    const baseQuery = getDiscoverEsqlQuery({
      definition: definition.stream,
      indexMode: definition.index_mode,
    });

    if (!baseQuery) {
      return undefined;
    }

    const histogramQuery = `${baseQuery} | STATS metric = COUNT(*) BY @timestamp = BUCKET(@timestamp, ${bucketSize})`;

    return {
      baseQuery,
      histogramQuery,
    };
  }, [bucketSize, definition.stream, definition.index_mode]);

  const discoverLink = useMemo(() => {
    if (!discoverLocator || !queries?.baseQuery) {
      return undefined;
    }

    return discoverLocator.getRedirectUrl({
      query: {
        esql: queries.baseQuery,
      },
    });
  }, [queries?.baseQuery, discoverLocator]);

  const histogramQueryFetch = useStreamsAppFetch(
    async ({ signal, timeState: { start, end } }) => {
      if (!queries?.histogramQuery || !indexPatterns) {
        return undefined;
      }

      const existingIndices = await dataViews.getExistingIndices(indexPatterns);

      if (existingIndices.length === 0) {
        return undefined;
      }

      const timezone = uiSettings?.get<'Browser' | string>(UI_SETTINGS.DATEFORMAT_TZ);

      return executeEsqlQuery({
        query: queries.histogramQuery,
        search: data.search.search,
        timezone,
        signal,
        start,
        end,
      });
    },
    [queries?.histogramQuery, indexPatterns, dataViews, uiSettings, data.search.search],
    {
      withTimeRange: true,
    }
  );

  const docCountFetch = useStreamsAppFetch(
    async ({
      signal,
      timeState: {
        asAbsoluteTimeRange: { from, to },
      },
    }) => {
      if (!definition) {
        return undefined;
      }
      return streamsRepositoryClient.fetch('GET /internal/streams/{name}/_details', {
        signal,
        params: {
          path: {
            name: definition.stream.name,
          },
          query: {
            start: from,
            end: to,
          },
        },
      });
    },
    [definition, streamsRepositoryClient],
    { withTimeRange: true }
  );

  const [value, unit] = bucketSize.split(' ') as [DurationInputArg1, DurationInputArg2];

  const xDomain = {
    min: timeState.start,
    max: timeState.end,
    minInterval: moment.duration(value, unit).asMilliseconds(),
  };

  const docCount = docCountFetch?.value?.details.count;
  const formattedDocCount = docCount ? formatNumber(docCount, 'decimal0') : '0';

  const dataStreamExists =
    Streams.WiredStream.GetResponse.is(definition) || definition.data_stream_exists;

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiFlexGroup
        direction="column"
        className={css`
          height: 100%;
          min-height: 300px;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                {i18n.translate('xpack.streams.streamDetailOverview.logRate', {
                  defaultMessage: '{number} documents',
                  values: {
                    number: formattedDocCount,
                  },
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup>
                <EuiButtonEmpty
                  data-test-subj="streamsDetailOverviewOpenInDiscoverButton"
                  iconType="discoverApp"
                  href={discoverLink}
                  isDisabled={!discoverLink || !dataStreamExists}
                >
                  {i18n.translate('xpack.streams.streamDetailOverview.openInDiscoverButtonLabel', {
                    defaultMessage: 'Open in Discover',
                  })}
                </EuiButtonEmpty>
                <StreamsAppSearchBar
                  placeholder={i18n.translate(
                    'xpack.streams.entityDetailOverview.searchBarPlaceholder',
                    {
                      defaultMessage: 'Filter data by using KQL',
                    }
                  )}
                  showDatePicker
                />
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow>
          <ControlledEsqlChart
            result={histogramQueryFetch}
            id="entity_log_rate"
            metricNames={['metric']}
            chartType={'bar'}
            xDomain={xDomain}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
