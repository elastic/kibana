/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import {
  createLogger,
  InfraSynthtraceEsClient,
  LogLevel,
  InfraSynthtraceKibanaClient,
} from '@kbn/apm-synthtrace';
import { infra, timerange } from '@kbn/apm-synthtrace-client';

export const journey = new Journey({
  beforeSteps: async ({ kbnUrl, auth, es }) => {
    const logger = createLogger(LogLevel.debug);
    const synthKibanaClient = new InfraSynthtraceKibanaClient({
      logger,
      target: kbnUrl.get(),
      username: auth.getUsername(),
      password: auth.getPassword(),
    });

    const pkgVersion = await synthKibanaClient.fetchLatestSystemPackageVersion();
    await synthKibanaClient.installSystemPackage(pkgVersion);

    const synthEsClient = new InfraSynthtraceEsClient({
      logger,
      client: es,
      refreshAfterIndex: true,
    });

    const start = Date.now() - 1000 * 60 * 10;
    await synthEsClient.index(
      generateHostsData({
        from: new Date(start).toISOString(),
        to: new Date().toISOString(),
        count: 1000,
      })
    );
  },
}).step('Navigate to Hosts view and load 500 hosts', async ({ page, kbnUrl }) => {
  await page.goto(
    kbnUrl.get(
      `app/metrics/hosts?_a=(dateRange:(from:now-15m,to:now),filters:!(),limit:500,panelFilters:!(),query:(language:kuery,query:''))`
    )
  );
  await page.waitForSelector('[data-test-subj="hostsView-tableRow"]');
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
    .rate(1)
    .generator((timestamp, index) =>
      hosts.flatMap((host) => [
        host.cpu().timestamp(timestamp),
        host.memory().timestamp(timestamp + 1),
        host.network().timestamp(timestamp + 2),
        host.load().timestamp(timestamp + 3),
        host.filesystem().timestamp(timestamp + 4),
        host.diskio().timestamp(timestamp + 5),
      ])
    );
}
