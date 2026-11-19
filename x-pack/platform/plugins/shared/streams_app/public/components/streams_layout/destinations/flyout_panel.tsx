/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { OverviewTimeFilter } from '../../stream_detail_overview/overview_time_filter';

/**
 * A bordered panel in the destination flyout, laid out as the ingest chart panel of a local
 * Elasticsearch destination is: a title and a subtitle on the left and, when asked, the time picker
 * on the right. It holds the stats of a destination and its configuration, so that nothing floats
 * loose in the flyout. A destination that has no other picker in its flyout, such as S3, passes
 * `showTimePicker` on its stats, so that their range can be changed from the flyout. The picker is
 * the page's own, so two panels that both show one are always on the same range.
 */
export function FlyoutPanel({
  title,
  subtitle,
  showTimePicker = false,
  children,
  'data-test-subj': dataTestSubj,
}: React.PropsWithChildren<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  showTimePicker?: boolean;
  'data-test-subj'?: string;
}>) {
  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj={dataTestSubj}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
          {subtitle && (
            <EuiText size="xs" color="subdued">
              <p>{subtitle}</p>
            </EuiText>
          )}
        </EuiFlexItem>
        {showTimePicker && (
          <EuiFlexItem grow={false}>
            <OverviewTimeFilter />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {children}
    </EuiPanel>
  );
}
