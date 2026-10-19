/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import type { Collector } from './driver';
import type { KibanaTarget } from './kibana_client';
import { kbn } from './kibana_client';

const now = () => performance.timeOrigin + performance.now();

/** Low-rate laptop-side open-loop probe (cross-check of the in-pod probe; includes WAN). */
export class LaptopProbe {
  private timer?: NodeJS.Timeout;
  private next = 0;
  constructor(
    private readonly target: KibanaTarget,
    private readonly rps: number,
    private readonly probePath: string,
    private readonly collector: Collector
  ) {}

  public start(): void {
    const period = 1000 / this.rps;
    this.next = now();
    const tick = () => {
      while (this.next <= now()) {
        const intended = this.next;
        const sent = now();
        kbn(this.target, 'GET', this.probePath, undefined, 120000)
          .then(({ status }) => {
            const end = now();
            this.collector.write({
              source: 'probe',
              thread: 'driver',
              pod: 'driver',
              ts: intended,
              intended,
              sent,
              end,
              latency_ms: end - intended,
              service_ms: end - sent,
              status,
            });
          })
          .catch((e) => {
            const end = now();
            this.collector.write({
              source: 'probe',
              thread: 'driver',
              pod: 'driver',
              ts: intended,
              intended,
              sent,
              end,
              latency_ms: end - intended,
              service_ms: end - sent,
              status: 0,
              error: String(e?.name ?? e),
            });
          });
        this.next += period;
      }
      this.timer = setTimeout(tick, Math.max(0, this.next - now()));
    };
    tick();
  }

  public stop(): void {
    if (this.timer) clearTimeout(this.timer);
  }
}
