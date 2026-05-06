/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface AlertTimelineFooterProps {
  viewAllHref: string;
}

export const AlertTimelineFooter: React.FC<AlertTimelineFooterProps> = ({ viewAllHref }) => (
  <EuiFlexGroup
    justifyContent="flexEnd"
    alignItems="flexEnd"
    gutterSize="m"
    responsive={false}
    data-test-subj="alertTimelineFooter"
  >
    <EuiFlexItem grow={false}>
      <EuiLink href={viewAllHref} data-test-subj="alertTimelineViewAllEpisodes">
        {i18n.translate('xpack.alertingV2.alertTimeline.viewAllEpisodes', {
          defaultMessage: 'View all episodes →',
        })}
      </EuiLink>
    </EuiFlexItem>
  </EuiFlexGroup>
);
