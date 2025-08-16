/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSkeletonRectangle, EuiFlexGroup } from '@elastic/eui';
import { dynamic } from '@kbn/shared-ux-utility';
import { capitalize } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useOverviewSummaryPanel } from '../../hooks/use_overview_summary_panel';

const QualityIndicator = dynamic(() => import('./indicator'));

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function OverallDataQualityIndicator() {
  const { isSummaryPanelLoading, quality } = useOverviewSummaryPanel();
  const translatedQuality = i18n.translate('xpack.datasetQuality.datasetQualityIdicator', {
    defaultMessage: '{quality}',
    values: { quality: capitalize(quality) },
  });

  return (
    <EuiSkeletonRectangle
      width="50px"
      height="20px"
      borderRadius="m"
      isLoading={isSummaryPanelLoading}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <QualityIndicator quality={quality} description={translatedQuality} />
      </EuiFlexGroup>
    </EuiSkeletonRectangle>
  );
}
