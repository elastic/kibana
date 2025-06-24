/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedNumber } from '@kbn/i18n-react';
import React from 'react';

const FEW_QUALITY_STATS_DOCS_THRESHOLD = 0.0005;

export function QualityPercentageIndicator({
  percentage,
  docsCount = 0,
  fewDocsTooltipContent,
}: {
  percentage: number;
  docsCount?: number;
  fewDocsTooltipContent: (docsCount: number) => string;
}) {
  const isFewDocsAvailable = percentage && percentage < FEW_QUALITY_STATS_DOCS_THRESHOLD;

  return isFewDocsAvailable ? (
    <DatasetWithFewQualityStatsDocs
      docsCount={docsCount}
      fewDocsTooltipContent={fewDocsTooltipContent}
    />
  ) : (
    <DatasetWithManyQualityStatsDocs percentage={percentage} />
  );
}

const DatasetWithFewQualityStatsDocs = ({
  docsCount,
  fewDocsTooltipContent,
}: {
  docsCount: number;
  fewDocsTooltipContent: (docsCount: number) => string;
}) => {
  return (
    <EuiText size="s">
      ~0%{' '}
      <EuiToolTip content={fewDocsTooltipContent(docsCount)}>
        <EuiIcon type="warning" color="warning" size="s" />
      </EuiToolTip>
    </EuiText>
  );
};

const DatasetWithManyQualityStatsDocs = ({ percentage }: { percentage: number }) => {
  return (
    <EuiText size="s">
      <FormattedNumber value={Number(percentage.toFixed(2))} />%
    </EuiText>
  );
};
