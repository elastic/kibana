/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';
import type { Logger } from '@kbn/core/server';
import type { KibanaDiscoveryService } from '../kibana_discovery_service';

export interface HttpClaimNudgeClientOptions {
  logger: Logger;
  kibanaDiscoveryService: KibanaDiscoveryService;
  timeoutMs: number;
  serverBasePath: string;
}

interface CachedAddressSet {
  cachedAt: number;
  addresses: string[];
  discoveredNodes: number;
}

const NODE_CACHE_TTL_MS = 5_000;

export class HttpClaimNudgeClient {
  private readonly logger: Logger;
  private readonly kibanaDiscoveryService: KibanaDiscoveryService;
  private readonly timeoutMs: number;
  private readonly nudgePath: string;
  private addressCache: CachedAddressSet | undefined;
  private hasLoggedConnectivityCheck = false;

  constructor({
    logger,
    kibanaDiscoveryService,
    timeoutMs,
    serverBasePath,
  }: HttpClaimNudgeClientOptions) {
    this.logger = logger;
    this.kibanaDiscoveryService = kibanaDiscoveryService;
    this.timeoutMs = timeoutMs;
    this.nudgePath = `${serverBasePath}/internal/task_manager/_claim_nudge`;
  }

  public async notify() {
    const { addresses, discoveredNodes } = await this.getNodeAddresses();

    this.logger.info(
      `[claim_nudge] notify discovered_nodes=${discoveredNodes} addressable_nodes=${addresses.length}`
    );

    if (addresses.length === 0) {
      this.logger.info('[claim_nudge] notify discovered_nodes=0, skipping HTTP nudge');
      return;
    }

    if (!this.hasLoggedConnectivityCheck) {
      this.logger.info(
        `[claim_nudge] connectivity_check node_targets=${JSON.stringify(addresses)} path=${this.nudgePath} timeout_ms=${this.timeoutMs}`
      );
      this.hasLoggedConnectivityCheck = true;
    }

    const results = await Promise.allSettled(
      addresses.map((address) => this.sendNudgeRequest(address, this.nudgePath, this.timeoutMs))
    );

    let successCount = 0;
    for (const result of results) {
      if (result.status === 'fulfilled') {
        successCount += 1;
        this.logger.info(
          `[claim_nudge] notify node=${result.value.address} status=${result.value.statusCode} response_ms=${result.value.elapsedMs}`
        );
      } else {
        this.logger.info(`[claim_nudge] notify failed: ${result.reason}`);
      }
    }

    if (successCount === 0) {
      this.logger.info(
        '[claim_nudge] all_nodes_failed for notify, tasks will be claimed by regular poll interval'
      );
    }
  }

  private async getNodeAddresses() {
    const now = Date.now();
    if (this.addressCache && now - this.addressCache.cachedAt < NODE_CACHE_TTL_MS) {
      return {
        discoveredNodes: this.addressCache.discoveredNodes,
        addresses: this.addressCache.addresses,
      };
    }

    let activeNodes: Awaited<ReturnType<KibanaDiscoveryService['getActiveKibanaNodes']>>;
    try {
      activeNodes = await this.kibanaDiscoveryService.getActiveKibanaNodes();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.info(`[claim_nudge] discovery_failed while fetching active nodes: ${message}`);
      return {
        discoveredNodes: 0,
        addresses: [],
      };
    }
    const addresses = activeNodes
      .map((node) => node.attributes.address)
      .filter((address): address is string => Boolean(address));

    this.addressCache = {
      cachedAt: now,
      addresses,
      discoveredNodes: activeNodes.length,
    };

    this.logger.info(
      `[claim_nudge] refreshed_node_cache nodes=${addresses.length} cache_age_ms=0`
    );

    return {
      discoveredNodes: activeNodes.length,
      addresses,
    };
  }

  private sendNudgeRequest(address: string, path: string, timeoutMs: number) {
    const url = new URL(address);
    const isHttps = url.protocol === 'https:';
    const requestFn = isHttps ? httpsRequest : httpRequest;

    return new Promise<{ address: string; statusCode: number; elapsedMs: number }>(
      (resolve, reject) => {
        const startedAt = Date.now();
        const request = requestFn(
          {
            protocol: url.protocol,
            hostname: url.hostname,
            port: url.port,
            path,
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-elastic-internal-origin': 'task-manager',
              'kbn-xsrf': 'task-manager-claim-nudge',
              'content-length': '2',
            },
          },
          (response) => {
            const statusCode = response.statusCode ?? 0;
            response.resume();
            resolve({
              address,
              statusCode,
              elapsedMs: Date.now() - startedAt,
            });
          }
        );

        request.setTimeout(timeoutMs, () => {
          request.destroy(new Error(`timed_out=true response_ms=${Date.now() - startedAt}`));
        });
        request.on('error', (error) => {
          reject(
            `node=${address} failed: ${error.message} (response_ms=${Date.now() - startedAt})`
          );
        });

        request.write('{}');
        request.end();
      }
    );
  }
}
