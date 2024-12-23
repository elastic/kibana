/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonRectangle, EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { capitalize } from 'lodash';
import { i18n } from '@kbn/i18n';
import { QualityIndicators } from '../../../common/types';
import { QualityIndicator } from '.';

export const DatasetQualityIndicator = ({
  isLoading,
  quality,
  textSize = 's',
}: {
  isLoading: boolean;
  quality: QualityIndicators;
  textSize?: 'xs' | 's' | 'm';
}) => {
  const translatedQuality = i18n.translate('xpack.datasetQuality.datasetQualityIdicator', {
    defaultMessage: '{quality}',
    values: { quality: capitalize(quality) },
  });

  return (
    <EuiSkeletonRectangle width="50px" height="20px" borderRadius="m" isLoading={isLoading}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <QualityIndicator
          textSize={textSize}
          quality={quality}
          description={translatedQuality}
          isColoredDescription
        />
      </EuiFlexGroup>
    </EuiSkeletonRectangle>
  );
};
