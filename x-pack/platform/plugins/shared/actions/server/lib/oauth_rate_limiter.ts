/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OAuthRateLimiterConfig } from '../config';
import { parseDuration } from './parse_date';

type OAuthEndpoint = 'authorize' | 'callback';

export class OAuthRateLimiter {
  private logsByUserAndEndpoint: Map<string, number[]>;
  private readonly config: OAuthRateLimiterConfig;

  constructor({ config }: { config: OAuthRateLimiterConfig }) {
    this.logsByUserAndEndpoint = new Map();
    this.config = config;
  }

  log(username: string, endpoint: OAuthEndpoint) {
    const key = this.createKey(username, endpoint);
    const now = Date.now();

    if (!this.logsByUserAndEndpoint.has(key)) {
      this.logsByUserAndEndpoint.set(key, []);
    }

    this.logsByUserAndEndpoint.get(key)!.push(now);
  }

  isRateLimited(username: string, endpoint: OAuthEndpoint): boolean {
    const key = this.createKey(username, endpoint);
    this.cleanupOldLogs(key, endpoint);

    const count = this.getLogs(username, endpoint).length;
    const limit = this.config[endpoint].limit;

    return count >= limit;
  }

  getLogs(username: string, endpoint: OAuthEndpoint): number[] {
    const key = this.createKey(username, endpoint);
    return this.logsByUserAndEndpoint.get(key) || [];
  }

  private cleanupOldLogs(key: string, endpoint: OAuthEndpoint) {
    const endpointConfig = this.config[endpoint];
    const now = Date.now();
    const cutoff = now - parseDuration(endpointConfig.lookbackWindow);

    const filtered = this.logsByUserAndEndpoint.get(key)?.filter((ts) => ts >= cutoff) || [];
    this.logsByUserAndEndpoint.set(key, filtered);
  }

  private createKey(username: string, endpoint: OAuthEndpoint): string {
    return `${username}:${endpoint}`;
  }
}
