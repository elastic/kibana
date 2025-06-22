/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDuration } from './parse_date';

interface ConfigByConnector {
  lookBackWindow: string;
  limit: number;
}

export class ConnectorRateLimiter {
  private logsByConnectors: Map<string, number[]>;
  private readonly configsByConnectors: { [key: string]: ConfigByConnector };

  constructor() {
    this.logsByConnectors = new Map();
    this.configsByConnectors = {};
    this.configsByConnectors.email = {
      lookBackWindow: '1m',
      limit: 300,
    };
  }

  log(connectorTypeId: string) {
    const connector = this.trimLeadingDot(connectorTypeId);
    const now = Date.now();
    if (!this.logsByConnectors.has(connector)) {
      this.logsByConnectors.set(connector, []);
    }
    this.logsByConnectors.get(connector)!.push(now);
  }

  isRateLimited(connectorTypeId: string): boolean {
    const connector = this.trimLeadingDot(connectorTypeId);
    const count = this.getRequestCount(connector);
    if (this.configsByConnectors[connector]) {
      return count > this.configsByConnectors[connector].limit;
    }
    return false;
  }

  private getRequestCount(connectorTypeId: string) {
    const connector = this.trimLeadingDot(connectorTypeId);
    const now = Date.now();
    this.cleanupOldLogs({ connectorTypeId: connector, now });
    return this.logsByConnectors.get(connector)?.length || 0;
  }

  private cleanupOldLogs({ connectorTypeId, now }: { connectorTypeId: string; now: number }) {
    const connector = this.trimLeadingDot(connectorTypeId);
    const connectorConfig = this.configsByConnectors[connector];
    if (connectorConfig) {
      const cutoff = now - parseDuration(connectorConfig.lookBackWindow);
      const filtered = this.logsByConnectors.get(connector)?.filter((ts) => ts >= cutoff) || [];
      if (filtered.length > 0) {
        this.logsByConnectors.set(connector, filtered);
      } else {
        this.logsByConnectors.delete(connector);
      }
    }
  }

  private trimLeadingDot(connectorTypeId: string) {
    if (connectorTypeId.charAt(0) === '.') {
      return connectorTypeId.replace(/^\./, '');
    }
    return connectorTypeId;
  }
}
