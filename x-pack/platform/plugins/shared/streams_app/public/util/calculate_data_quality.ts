/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculatePercentage } from '@kbn/dataset-quality-plugin/public';
import { mapPercentageToQuality } from '@kbn/dataset-quality-plugin/common';
import type { QualityIndicators } from '@kbn/dataset-quality-plugin/common';

export function calculateDataQuality({
  totalDocs,
  degradedDocs,
  failedDocs,
}: {
  totalDocs: number;
  degradedDocs: number;
  failedDocs: number;
}): QualityIndicators {
  const degradedPercentage = calculatePercentage({
    totalDocs,
    count: degradedDocs,
  });

  const failedPercentage = calculatePercentage({
    totalDocs,
    count: failedDocs,
  });

  const quality = mapPercentageToQuality([degradedPercentage, failedPercentage]);

  return quality;
}
