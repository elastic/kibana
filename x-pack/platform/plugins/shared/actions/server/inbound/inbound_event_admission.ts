/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InboundEventAdmissionConfig } from '../actions_config';

export type InboundEventAdmissionDecision =
  | { allowed: true; release: () => void }
  | { allowed: false; retryAfterSeconds: 1; scope: 'process' | 'connector' };

/** In-flight slot counts for the inbound hub. One instance per Kibana process. */
export class InboundEventAdmission {
  private inFlight = 0;
  private readonly connectorInFlight = new Map<string, number>();

  constructor(private readonly config: InboundEventAdmissionConfig) {}

  /**
   * Reserves a slot when both caps have room. `release` drops both counts once.
   * Synchronous. Does not allocate per denied key.
   */
  tryAdmit(connectorKey: string): InboundEventAdmissionDecision {
    if (!this.config.enabled) {
      return { allowed: true, release: () => undefined };
    }

    if (this.inFlight >= this.config.maxInFlight) {
      return { allowed: false, retryAfterSeconds: 1, scope: 'process' };
    }

    const connectorCount = this.connectorInFlight.get(connectorKey) ?? 0;
    if (connectorCount >= this.config.maxInFlightPerConnector) {
      return { allowed: false, retryAfterSeconds: 1, scope: 'connector' };
    }

    this.inFlight += 1;
    this.connectorInFlight.set(connectorKey, connectorCount + 1);

    let released = false;
    const release = () => {
      if (released) {
        return;
      }
      released = true;
      this.inFlight = Math.max(0, this.inFlight - 1);
      const nextCount = (this.connectorInFlight.get(connectorKey) ?? 1) - 1;
      if (nextCount <= 0) {
        this.connectorInFlight.delete(connectorKey);
        return;
      }
      this.connectorInFlight.set(connectorKey, nextCount);
    };

    return { allowed: true, release };
  }
}
