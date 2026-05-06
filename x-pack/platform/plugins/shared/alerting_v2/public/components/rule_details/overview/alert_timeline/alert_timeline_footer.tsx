/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface AlertTimelineFooterProps {
  visibleRowCount: number;
  totalRowCount: number;
  viewAllHref: string;
}

export const AlertTimelineFooter: React.FC<AlertTimelineFooterProps> = ({
  visibleRowCount,
  totalRowCount,
  viewAllHref,
}) => (
  <EuiFlexGroup
    justifyContent="flexEnd"
    alignItems="center"
    gutterSize="m"
    responsive={false}
    data-test-subj="alertTimelineFooter"
  >
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.alertingV2.alertTimeline.showingCount', {
          defaultMessage: 'Showing {visible} of {total}',
          values: { visible: visibleRowCount, total: totalRowCount },
        })}
      </EuiText>
    </EuiFlexItem>
    {totalRowCount > visibleRowCount && (
      <EuiFlexItem grow={false}>
        <EuiLink href={viewAllHref} data-test-subj="alertTimelineViewAllEpisodes">
          {i18n.translate('xpack.alertingV2.alertTimeline.viewAllEpisodes', {
            defaultMessage: 'View all {total} episodes →',
            values: { total: totalRowCount },
          })}
        </EuiLink>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);
