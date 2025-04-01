/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { infra, timerange } from '@kbn/apm-synthtrace-client';

export function generateHostsData({
  from,
  to,
  count = 1,
}: {
  from: Date;
  to: Date;
  count?: number;
}) {
  const range = timerange(from.toISOString(), to.toISOString());

  const hosts = Array(count)
    .fill(0)
    .map((_, idx) => infra.host(`my-host-${idx}`));

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp, index) =>
      hosts.flatMap((host) => [
        host.cpu().timestamp(timestamp),
        host.memory().timestamp(timestamp),
        host.network().timestamp(timestamp),
        host.load().timestamp(timestamp),
        host.filesystem().timestamp(timestamp),
        host.diskio().timestamp(timestamp),
      ])
    );
}
