/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LOG_RATE_ANALYSIS_TYPE } from './log_rate_analysis_type';
import type { LogRateAnalysisType } from './log_rate_analysis_type';

/**
 * Calculates the change in log rate between two time periods and generates a descriptive message.
 * It return the factor as a number as well as a human readable message.
 *
 * @param analysisType The type of log rate analysis (spike or dip).
 * @param baselineBucketRate The log rate (document count per unit time) during the baseline period.
 * @param deviationBucketRate The log rate (document count per unit time) during the deviation period.
 * @returns An object containing the message describing the rate change and the factor of change if applicable.
 */
export function getLogRateChange(
  analysisType: LogRateAnalysisType,
  baselineBucketRate: number,
  deviationBucketRate: number
): { message: string; factor?: number } {
  if (analysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE) {
    if (baselineBucketRate > 0) {
      const factor = deviationBucketRate / baselineBucketRate;
      const roundedFactor = factor < 10 ? Math.round(factor * 10) / 10 : Math.round(factor);

      const message = i18n.translate(
        'xpack.aiops.logRateAnalysis.resultsTableGroups.logRateFactorIncreaseLabel',
        {
          defaultMessage: '{roundedFactor}x higher',
          values: {
            roundedFactor,
          },
        }
      );

      return {
        message,
        factor: roundedFactor,
      };
    } else {
      return {
        message: i18n.translate(
          'xpack.aiops.logRateAnalysis.resultsTableGroups.logRateDocIncreaseLabel',
          {
            defaultMessage: 'up to {deviationBucketRate} from 0 in baseline',
            values: { deviationBucketRate },
          }
        ),
      };
    }
  } else {
    if (deviationBucketRate > 0) {
      // For dip, "doc count" refers to the amount of documents in the baseline time range so we use baselineBucketRate
      const factor = baselineBucketRate / deviationBucketRate;
      const roundedFactor = factor < 10 ? Math.round(factor * 10) / 10 : Math.round(factor);

      const message = i18n.translate(
        'xpack.aiops.logRateAnalysis.resultsTableGroups.logRateFactorDecreaseLabel',
        {
          defaultMessage: '{roundedFactor}x lower',
          values: {
            roundedFactor,
          },
        }
      );

      return {
        message,
        factor: roundedFactor,
      };
    } else {
      return {
        message: i18n.translate(
          'xpack.aiops.logRateAnalysis.resultsTableGroups.logRateDocDecreaseLabel',
          {
            defaultMessage: 'down to 0 from {baselineBucketRate} in baseline',
            values: { baselineBucketRate },
          }
        ),
      };
    }
  }
}
