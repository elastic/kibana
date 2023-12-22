/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { createLogger, InfraSynthtraceEsClient, LogLevel } from '@kbn/apm-synthtrace';
import { infra, timerange } from '@kbn/apm-synthtrace-client';

export const journey = new Journey({
  beforeSteps: async ({ kbnUrl, log, auth, es }) => {
    const synthClient = new InfraSynthtraceEsClient({
      logger: createLogger(LogLevel.info),
      client: es,
      refreshAfterIndex: true,
    });

    const start = Date.now() - 1000 * 60 * 10;
    await synthClient.index(
      generateHostsData({
        from: new Date(start).toISOString(),
        to: new Date().toISOString(),
        count: 1000,
      })
    );
  },
})
  .step('Navigate to Hosts view and load 100 hosts (default)', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`app/metrics/hosts`));
    await page.waitForSelector(`[data-test-subj="hostsView-tableRow"]`);
  })
  .step('Load 500 hosts', async ({ page, kbnUrl }) => {
    await page.click('[data-test-subj="hostsViewLimitSelection500Button"]');
    await page.waitForSelector(`[data-test-subj="hostsView-tableRow"]`);
  })
  .step('Load 50 hosts', async ({ page, kbnUrl }) => {
    await page.click('[data-test-subj="hostsViewLimitSelection50Button"]');
    await page.waitForSelector(`[data-test-subj="hostsView-tableRow"]`);
  });

export function generateHostsData({
  from,
  to,
  count = 1,
}: {
  from: string;
  to: string;
  count: number;
}) {
  const range = timerange(from, to);

  const hosts = Array(count)
    .fill(0)
    .map((_, idx) => infra.host(`my-host-${idx}`));

  return range
    .interval('30s')
    .rate(5)
    .generator((timestamp, index) =>
      hosts.flatMap((host) => [
        host.cpu().timestamp(timestamp),
        host.memory().timestamp(timestamp),
        host.network().timestamp(timestamp),
        host.load().timestamp(timestamp),
        host.filesystem().timestamp(timestamp),
      ])
    );
}
