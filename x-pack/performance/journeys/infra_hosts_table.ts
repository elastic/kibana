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
import { subj } from '@kbn/test-subj-selector';

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
}).step('Navigate to Hosts view and load 500 hosts', async ({ page, kbnUrl, kibanaPage }) => {
  await page.goto(
    kbnUrl.get(
      `app/metrics/hosts?_a=(dateRange:(from:now-15m,to:now),filters:!(),limit:500,panelFilters:!(),query:(language:kuery,query:''))`
    )
  );
  // wait for table to be loaded
  await page.waitForSelector(subj('hostsView-table-loaded'));
  // wait for metric charts to be loaded
  await kibanaPage.waitForCharts({ count: 5, timeout: 60000 });
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
