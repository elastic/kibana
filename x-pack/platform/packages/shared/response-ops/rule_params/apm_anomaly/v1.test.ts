/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { AnomalyDetectorType, anomalyParamsSchema } from './v1';

const base = {
  serviceName: 'opbeans-java',
  transactionType: 'request',
  windowSize: 30,
  windowUnit: 'm',
  environment: 'production',
  anomalySeverityType: ML_ANOMALY_SEVERITY.CRITICAL,
  anomalyDetectorTypes: [AnomalyDetectorType.txLatency],
};

describe('anomalyParamsSchema', () => {
  it('accepts valid params, including empty and maximum length strings', () => {
    expect(() => anomalyParamsSchema.validate(base)).not.toThrow();
    expect(() =>
      anomalyParamsSchema.validate({ ...base, serviceName: '', environment: 'a'.repeat(1024) })
    ).not.toThrow();
  });

  it.each(['serviceName', 'transactionType', 'environment'])('rejects an over-long %s', (field) => {
    expect(() => anomalyParamsSchema.validate({ ...base, [field]: 'a'.repeat(1025) })).toThrow(
      /maximum length/
    );
  });

  it('rejects an over-long windowUnit', () => {
    expect(() => anomalyParamsSchema.validate({ ...base, windowUnit: 'm'.repeat(11) })).toThrow(
      /maximum length/
    );
  });

  it('rejects more detector types than there are detectors', () => {
    const detectors = Object.values(AnomalyDetectorType);
    expect(() =>
      anomalyParamsSchema.validate({ ...base, anomalyDetectorTypes: detectors })
    ).not.toThrow();
    expect(() =>
      anomalyParamsSchema.validate({
        ...base,
        anomalyDetectorTypes: [...detectors, AnomalyDetectorType.txLatency],
      })
    ).toThrow(/array size is \[5\], but cannot be greater than \[4\]/);
  });
});
