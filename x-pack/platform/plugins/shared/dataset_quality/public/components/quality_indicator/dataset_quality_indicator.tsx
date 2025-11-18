/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonRectangle, EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { QualityIndicators } from '../../../common/types';
import {
  summaryPanelQualityGoodText,
  summaryPanelQualityDegradedText,
  summaryPanelQualityPoorText,
} from '../../../common/translations';
import { QualityIndicator } from '.';

export const DatasetQualityIndicator = ({
  isLoading,
  quality,
  verbose = false,
  dataTestSubj,
}: {
  isLoading: boolean;
  quality: QualityIndicators;
  verbose?: boolean;
  dataTestSubj?: string;
}) => {
  const QUALITY_LABELS: Record<QualityIndicators, string> = {
    good: summaryPanelQualityGoodText,
    degraded: summaryPanelQualityDegradedText,
    poor: summaryPanelQualityPoorText,
  };

  const translatedQuality = i18n.translate('xpack.datasetQuality.datasetQualityIdicator', {
    defaultMessage: '{quality}{verbose, select, true { quality} other {}}',
    values: { quality: QUALITY_LABELS[quality], verbose },
  });

  return (
    <EuiSkeletonRectangle width="50px" height="20px" borderRadius="m" isLoading={isLoading}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <QualityIndicator
          dataTestSubj={dataTestSubj}
          quality={quality}
          description={translatedQuality}
        />
      </EuiFlexGroup>
    </EuiSkeletonRectangle>
  );
};
