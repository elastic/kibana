/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { performance } from 'perf_hooks';
import type { LatencyStats } from './stats';
import { delay, summarize } from './stats';

export const ALERTING_CASES_INDEX = '.kibana_alerting_cases';

export interface ProbeResult {
  latency: LatencyStats;
  errors: number;
}

/**
 * Times the write a rule run makes to its saved object when it finishes: a partial update of
 * the rule document in the index shared with Cases, with no refresh. The probe rule is
 * disabled, so rewriting `running: false` changes nothing.
 */
export class RuleWriteProbe {
  private samples: number[] = [];
  private errors = 0;
  private running = false;
  private loop: Promise<void> = Promise.resolve();

  constructor(
    private readonly es: Client,
    private readonly ruleId: string,
    private readonly intervalMs: number
  ) {}

  public start(): void {
    this.samples = [];
    this.errors = 0;
    this.running = true;
    this.loop = this.run();
  }

  public async stop(): Promise<ProbeResult> {
    this.running = false;
    await this.loop;
    return { latency: summarize(this.samples), errors: this.errors };
  }

  private async run(): Promise<void> {
    while (this.running) {
      const start = performance.now();
      try {
        await this.es.update({
          index: ALERTING_CASES_INDEX,
          id: `alert:${this.ruleId}`,
          doc: { alert: { running: false } },
          refresh: false,
        });
        this.samples.push(performance.now() - start);
      } catch {
        this.errors += 1;
      }
      await delay(this.intervalMs);
    }
  }
}
