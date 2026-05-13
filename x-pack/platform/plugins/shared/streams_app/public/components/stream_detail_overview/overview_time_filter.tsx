/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiSuperDatePicker } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import { Streams, getDiscoverEsqlQuery } from '@kbn/streams-schema';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamDetail } from '../../hooks/use_stream_detail';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { useTimeRange } from '../../hooks/use_time_range';
import { useTimeRangeUpdate } from '../../hooks/use_time_range_update';
import { useTimefilter } from '../../hooks/use_timefilter';

export function OverviewTimeFilter() {
  const { rangeFrom, rangeTo } = useTimeRange();
  const { updateTimeRange } = useTimeRangeUpdate();
  const { refresh } = useTimefilter();
  const { definition } = useStreamDetail();
  const { features } = useStreamsPrivileges();
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();

  const isIngestStream = Streams.ingest.all.GetResponse.is(definition);
  const esqlQuery = getDiscoverEsqlQuery({
    definition: definition.stream,
    indexMode: isIngestStream ? definition.index_mode ?? 'standard' : undefined,
    includeMetadata: Streams.WiredStream.GetResponse.is(definition),
    useViews: features.wiredStreamViews.enabled,
  });

  const discoverHref = share.url.locators.useUrl<DiscoverAppLocatorParams>(
    () => ({
      id: DISCOVER_APP_LOCATOR,
      params: {
        query: { esql: esqlQuery ?? '' },
        timeRange: { from: rangeFrom, to: rangeTo },
      },
    }),
    [esqlQuery, rangeFrom, rangeTo]
  );

  return (
    <EuiFlexGroup gutterSize="xs">
      <EuiFlexItem>
        <EuiSuperDatePicker
          start={rangeFrom}
          end={rangeTo}
          compressed
          onRefresh={() => refresh()}
          width="full"
          showUpdateButton="iconOnly"
          updateButtonProps={{
            size: 's',
            fill: false,
          }}
          onTimeChange={({ start, end }) => updateTimeRange({ from: start, to: end })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
