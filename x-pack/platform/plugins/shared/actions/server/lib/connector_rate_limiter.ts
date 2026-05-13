/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorRateLimiterConfig } from '../config';
import { parseDuration } from './parse_date';

export class ConnectorRateLimiter {
  private logsByConnectors: Map<string, number[]>;
  private readonly config?: ConnectorRateLimiterConfig;

  constructor({ config }: { config?: ConnectorRateLimiterConfig }) {
    this.logsByConnectors = new Map();
    this.config = config;
  }

  log(connectorTypeId: string) {
    if (!this.config) {
      return;
    }
    const trimmedConnectorTypeId = this.trimLeadingDot(connectorTypeId);
    if (this.config[trimmedConnectorTypeId]) {
      const now = Date.now();
      if (!this.logsByConnectors.has(trimmedConnectorTypeId)) {
        this.logsByConnectors.set(trimmedConnectorTypeId, []);
      }
      this.logsByConnectors.get(trimmedConnectorTypeId)!.push(now);
    }
  }

  isRateLimited(connectorTypeId: string): boolean {
    if (this.config) {
      const trimmedConnectorTypeId = this.trimLeadingDot(connectorTypeId);
      this.cleanupOldLogs(trimmedConnectorTypeId);
      if (this.config[trimmedConnectorTypeId]) {
        const count = this.getLogs(trimmedConnectorTypeId).length;
        return count > this.config[trimmedConnectorTypeId].limit;
      }
    }
    return false;
  }

  getLogs(connectorTypeId: string): number[] {
    return this.logsByConnectors.get(this.trimLeadingDot(connectorTypeId)) || [];
  }

  private cleanupOldLogs(connectorTypeId: string) {
    const connectorConfig = this.config?.[connectorTypeId];
    if (connectorConfig) {
      const now = Date.now();
      const cutoff = now - parseDuration(connectorConfig.lookbackWindow);
      const filtered =
        this.logsByConnectors.get(connectorTypeId)?.filter((ts) => ts >= cutoff) || [];
      if (filtered.length > 0) {
        this.logsByConnectors.set(connectorTypeId, filtered);
      } else {
        this.logsByConnectors.delete(connectorTypeId);
      }
    }
  }

  private trimLeadingDot(connectorTypeId: string): string {
    if (connectorTypeId.charAt(0) === '.') {
      return connectorTypeId.replace(/^\./, '');
    }
    return connectorTypeId;
  }
}
