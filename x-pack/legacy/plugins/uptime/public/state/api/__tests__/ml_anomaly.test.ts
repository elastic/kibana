/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMLJobId } from '../ml_anomaly';

describe('ML Anomaly API', () => {
  it('it generates a valid ML job ID', async () => {
    const monitorId = 'ABC1334haa';

    const jobId = getMLJobId(monitorId);

    expect(jobId).toEqual(jobId.toLowerCase());

    const longAndWeirdMonitorId =
      'https://auto-mmmmxhhhhhccclongAndWeirdMonitorId123yyyyyrereauto-xcmpa-1345555454646';
    const jobId1 = getMLJobId(longAndWeirdMonitorId);

    expect(jobId1.length <= 64).toBe(true);

    const monIdSpecialChars = '/ ? , " < > | *   a';

    const jobId2 = getMLJobId(monIdSpecialChars);

    const format = /[/?,"<>|*]+/;

    expect(format.test(jobId2)).toBe(false);
  });
});
