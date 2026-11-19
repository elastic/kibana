/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { createPatternTesterWorkerConfig, RegexWorkerService } from '@kbn/ai-anonymization-server';

/**
 * Owns the worker pool behind the pattern tester.
 *
 * The pool is created on first use rather than in `setup()` because a host plugin (the inference
 * plugin) may call `configure` after this plugin's own `setup()` has run. It is dedicated to the
 * tester: a timed-out task rebuilds the whole pool, so tested patterns must never share one with
 * real `chatComplete` traffic.
 */
export class PatternTesterWorker {
  private worker?: RegexWorkerService;
  private hostEnabled = true;

  constructor(private readonly options: { enabledByConfig: boolean; logger: Logger }) {}

  /**
   * Lets a host plugin switch the tester off, e.g. when it runs without worker threads. A host can
   * only restrict the tester: it never re-enables what this plugin's own config disabled.
   */
  public configure({ enabled }: { enabled: boolean }) {
    this.hostEnabled = enabled;
    // Drop a pool built from the previous settings; the next request builds a fresh one.
    const previous = this.worker;
    this.worker = undefined;
    previous?.stop().catch((error) => {
      this.options.logger.warn(`Failed to stop the pattern tester worker pool: ${error}`);
    });
  }

  public get(): RegexWorkerService {
    if (!this.worker) {
      this.worker = new RegexWorkerService(
        createPatternTesterWorkerConfig({
          enabled: this.options.enabledByConfig && this.hostEnabled,
        }),
        this.options.logger
      );
    }
    return this.worker;
  }

  public async stop() {
    await this.worker?.stop();
    this.worker = undefined;
  }
}
