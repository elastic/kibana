/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Phase 1's plan deliverable: "log every API the bundles touch that we had to fake". Every
 * browser shim in this package calls {@link recordShimUsage} the first time a given faked
 * API is actually invoked during a render, rather than merely installed. A shim nobody calls
 * is not interesting; a shim called 10,000 times from inside a tight loop is a performance
 * question, not just a correctness one -- `getCounts()` keeps both the first-use order and a
 * per-shim call count so a write-up (Phase 7) or a real report's debug output can show which
 * faked browser APIs a given dashboard's panels actually depended on.
 */

export interface ShimUsageEntry {
  name: string;
  /** The most recently recorded detail for this name, kept for backwards-compatible callers. */
  detail?: string;
  /**
   * Up to {@link MAX_DISTINCT_DETAILS} distinct `detail` strings seen for this name, in
   * first-seen order. A name like `performance.mark` is called once per distinct mark name
   * across every panel on the page (e.g. one `renderComplete` mark per embeddable type); only
   * surfacing the single most recent `detail` (the original behavior, kept as `detail` above)
   * made it impossible to tell *which* panel types had actually reached a given lifecycle
   * event from a failed render's dump alone.
   */
  distinctDetails: string[];
  count: number;
}

const MAX_DISTINCT_DETAILS = 20;

export class ShimUsageLog {
  private readonly order: string[] = [];
  private readonly counts = new Map<string, number>();
  private readonly lastDetail = new Map<string, string | undefined>();
  private readonly distinctDetails = new Map<string, Set<string>>();

  record(name: string, detail?: string): void {
    const count = this.counts.get(name) ?? 0;
    if (count === 0) this.order.push(name);
    this.counts.set(name, count + 1);
    if (detail !== undefined) {
      this.lastDetail.set(name, detail);
      let details = this.distinctDetails.get(name);
      if (!details) {
        details = new Set();
        this.distinctDetails.set(name, details);
      }
      if (details.size < MAX_DISTINCT_DETAILS) details.add(detail);
    }
  }

  getEntries(): ShimUsageEntry[] {
    return this.order.map((name) => ({
      name,
      detail: this.lastDetail.get(name),
      distinctDetails: Array.from(this.distinctDetails.get(name) ?? []),
      count: this.counts.get(name) ?? 0,
    }));
  }

  reset(): void {
    this.order.length = 0;
    this.counts.clear();
    this.lastDetail.clear();
    this.distinctDetails.clear();
  }
}
