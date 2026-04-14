/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, useIsWithinBreakpoints } from '@elastic/eui';
import { Streams } from '@kbn/streams-schema';
import React, { type CSSProperties, type ReactNode, useMemo } from 'react';
import { useStreamDetail } from '../../hooks/use_stream_detail';
import { AboutPanel } from './about_panel';
import { DataQualityCard } from './data_quality_card';
import { IngestRateChart } from './ingest_rate_chart';
import { OverviewTimeFilter } from './overview_time_filter';

interface OverviewSection {
  id: string;
  node: ReactNode;
  show: boolean;
}

export function StreamOverview() {
  const { definition } = useStreamDetail();

  const isIngest = Streams.ingest.all.GetResponse.is(definition);
  /** Match EuiFlexGroup responsive `m` max-breakpoint so sidebar stacks above main when narrow. */
  const isStackedOverviewLayout = useIsWithinBreakpoints(['xs', 's', 'm']);

  const mainColumnStyle = useMemo<CSSProperties | undefined>(
    () => (isStackedOverviewLayout ? { width: '100%' } : undefined),
    [isStackedOverviewLayout]
  );

  const sidebarColumnStyle = useMemo<CSSProperties>(
    () => (isStackedOverviewLayout ? { width: '100%' } : { width: 450 }),
    [isStackedOverviewLayout]
  );

  const mainSections: OverviewSection[] = [
    { id: 'ingest-rate-chart', node: <IngestRateChart />, show: true },
    { id: 'dataset-quality', node: <DataQualityCard />, show: isIngest },
    // Ticket 2
    // { id: 'systems', node: <SystemsPanel />, show: isIngest },
    // { id: 'attachments', node: <AttachmentList />, show: true },
  ];

  const sidebarSections: OverviewSection[] = [
    { id: 'time-filter', node: <OverviewTimeFilter />, show: true },
    { id: 'about', node: <AboutPanel />, show: true },
    // Ticket 2
    // { id: 'suggestions', node: <SuggestionsPanel />, show: true },
  ];

  return (
    <EuiFlexGroup
      alignItems="flexStart"
      gutterSize="m"
      direction={isStackedOverviewLayout ? 'columnReverse' : 'row'}
      responsive={false}
    >
      <EuiFlexItem grow={!isStackedOverviewLayout} style={mainColumnStyle}>
        <EuiFlexGroup direction="column" gutterSize="m">
          {mainSections
            .filter((s) => s.show)
            .map((s) => (
              <EuiFlexItem key={s.id} grow={false}>
                {s.node}
              </EuiFlexItem>
            ))}
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false} style={sidebarColumnStyle}>
        <EuiFlexGroup direction="column" gutterSize="m">
          {sidebarSections
            .filter((s) => s.show)
            .map((s) => (
              <EuiFlexItem key={s.id} grow={false}>
                {s.node}
              </EuiFlexItem>
            ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
