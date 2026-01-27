/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSearchBarProps, Query } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSearchBar,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import React, { useMemo, useState } from 'react';
import { compact } from 'lodash';
import { niceTimeFormatter } from '@elastic/charts';
import { css } from '@emotion/react';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { useFetchSignificantEvents } from '../../../../hooks/use_fetch_significant_events';
import {
  OCCURRENCES_CHART_TITLE,
  RUN_STREAM_DISCOVERY_BUTTON_LABEL,
  STREAMS_TABLE_SEARCH_ARIA_LABEL,
} from './translations';
import { StreamsTreeTable } from './tree_table';
import { useDiscoveryStreams } from './use_discovery_streams_fetch';
import { SignificantEventsHistogramChart } from '../significant_events_histogram_chart/significant_events_histogram_chart';
import { formatChangePoint } from '../../utils/change_point';
import { StreamsAppSearchBar } from '../../../streams_app_search_bar';

const datePickerStyle = css`
  .euiFormControlLayout,
  .euiSuperDatePicker button,
  .euiButton {
    height: 40px;
  }
`;

export function StreamsView() {
  const [searchQuery, setSearchQuery] = useState<Query | undefined>();
  const { timeState } = useTimefilter();
  const streamsListFetch = useDiscoveryStreams();
  const [selectedStreams, setSelectedStreams] = useState<ListStreamDetail[]>([]);
  const significantEventsFetchState = useFetchSignificantEvents();

  const xFormatter = useMemo(() => {
    return niceTimeFormatter([timeState.start, timeState.end]);
  }, [timeState.start, timeState.end]);

  const handleQueryChange: EuiSearchBarProps['onChange'] = ({ query }) => {
    if (query) setSearchQuery(query);
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem>
            <EuiSearchBar
              query={searchQuery}
              onChange={handleQueryChange}
              box={{
                incremental: true,
                'aria-label': STREAMS_TABLE_SEARCH_ARIA_LABEL,
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={datePickerStyle}>
            <StreamsAppSearchBar showDatePicker />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiPanel hasShadow={false} hasBorder={false} color="subdued">
          <EuiPanel hasBorder={true} color="plain">
            <EuiText>
              <h3>{OCCURRENCES_CHART_TITLE}</h3>
            </EuiText>
            <EuiSpacer size="m" />
            <SignificantEventsHistogramChart
              id={'all-events'}
              occurrences={significantEventsFetchState.data?.aggregated_occurrences ?? []}
              changes={compact(
                (significantEventsFetchState.data?.significant_events ?? []).map((item) =>
                  formatChangePoint({
                    query: item.query,
                    change_points: item.change_points,
                    occurrences: item.occurrences,
                  })
                )
              )}
              xFormatter={xFormatter}
              compressed={false}
              height={180}
            />
          </EuiPanel>
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiText size="s">
            {i18n.translate(
              'xpack.streams.significantEventsDiscovery.streamsTree.streamsCountLabel',
              {
                defaultMessage: '{count} streams',
                values: { count: streamsListFetch.value?.streams.length ?? 0 },
              }
            )}
          </EuiText>

          <EuiButtonEmpty iconType="securitySignalDetected" disabled={selectedStreams.length === 0}>
            {RUN_STREAM_DISCOVERY_BUTTON_LABEL}
          </EuiButtonEmpty>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <StreamsTreeTable
          streams={streamsListFetch.value?.streams}
          loading={streamsListFetch.loading}
          searchQuery={searchQuery}
          onSelectionChange={setSelectedStreams}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
