/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { anomalyThresholdSchema } from './anomaly_threshold';

describe('anomalyThresholdSchema', () => {
  it('accepts each known severity plus the literal "none"', () => {
    expectParseSuccess(anomalyThresholdSchema.safeParse(ML_ANOMALY_SEVERITY.CRITICAL));
    expectParseSuccess(anomalyThresholdSchema.safeParse(ML_ANOMALY_SEVERITY.MAJOR));
    expectParseSuccess(anomalyThresholdSchema.safeParse(ML_ANOMALY_SEVERITY.MINOR));
    expectParseSuccess(anomalyThresholdSchema.safeParse(ML_ANOMALY_SEVERITY.WARNING));
    expectParseSuccess(anomalyThresholdSchema.safeParse(ML_ANOMALY_SEVERITY.LOW));
    expectParseSuccess(anomalyThresholdSchema.safeParse('none'));
  });

  it('rejects UNKNOWN, which is deliberately excluded', () => {
    expectParseError(anomalyThresholdSchema.safeParse(ML_ANOMALY_SEVERITY.UNKNOWN));
  });
});
