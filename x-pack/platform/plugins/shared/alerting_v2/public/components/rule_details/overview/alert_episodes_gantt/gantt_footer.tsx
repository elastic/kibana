/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface GanttFooterProps {
  visibleRowCount: number;
  totalRowCount: number;
  viewAllHref: string;
}

export const GanttFooter: React.FC<GanttFooterProps> = ({
  visibleRowCount,
  totalRowCount,
  viewAllHref,
}) => (
  <EuiFlexGroup
    justifyContent="flexEnd"
    alignItems="center"
    gutterSize="m"
    responsive={false}
    data-test-subj="ganttFooter"
  >
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.alertingV2.ruleDetails.gantt.showingCount', {
          defaultMessage: 'Showing {visible} of {total}',
          values: { visible: visibleRowCount, total: totalRowCount },
        })}
      </EuiText>
    </EuiFlexItem>
    {totalRowCount > visibleRowCount && (
      <EuiFlexItem grow={false}>
        <EuiLink href={viewAllHref} data-test-subj="ganttViewAllEpisodes">
          {i18n.translate('xpack.alertingV2.ruleDetails.gantt.viewAllEpisodes', {
            defaultMessage: 'View all {total} episodes →',
            values: { total: totalRowCount },
          })}
        </EuiLink>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);
