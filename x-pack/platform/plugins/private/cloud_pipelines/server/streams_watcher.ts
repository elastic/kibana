/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CloudPipelinesConfig } from './config';
import { buildBundle, serialiseBundle, type StreamNode } from './bundle_builder';

const STREAMS_INDEX = '.kibana_streams';
const POLL_INTERVAL_MS = 5000;

interface WiredStreamDefinition {
  type: 'wired';
  name: string;
  ingest: {
    processing: { steps: unknown[] };
    wired: {
      routing: Array<{
        destination: string;
        where: unknown;
        status?: string;
      }>;
    };
  };
}

const isWiredStream = (doc: unknown): doc is WiredStreamDefinition => {
  if (typeof doc !== 'object' || doc === null) return false;
  const d = doc as Record<string, unknown>;
  if (d.type !== 'wired') return false;
  const ingest = d.ingest as Record<string, unknown> | undefined;
  return typeof ingest === 'object' && ingest !== null && ingest.wired != null;
};

export class StreamsWatcher {
  private esClient: ElasticsearchClient;
  private config: CloudPipelinesConfig;
  private logger: Logger;
  private timer?: ReturnType<typeof setTimeout>;
  private lastHash: string = '';
  private stopped = false;

  constructor(esClient: ElasticsearchClient, config: CloudPipelinesConfig, logger: Logger) {
    this.esClient = esClient;
    this.config = config;
    this.logger = logger;
  }

  start() {
    this.logger.info(
      `Starting streams watcher for ${this.config.targetType}/${this.config.targetId}`
    );
    this.poll();
  }

  stop() {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  private schedulePoll() {
    if (this.stopped) return;
    this.timer = setTimeout(() => this.poll(), POLL_INTERVAL_MS);
  }

  private async poll() {
    if (this.stopped) return;
    try {
      await this.checkAndSync();
    } catch (err) {
      this.logger.error(`Streams watcher poll failed: ${err}`);
    }
    this.schedulePoll();
  }

  private async checkAndSync() {
    const streams = await this.loadWiredStreams();
    const nodes: StreamNode[] = streams.map((s) => ({
      name: s.name,
      processing: s.ingest.processing,
      routing: s.ingest.wired.routing,
    }));

    const hasWork = nodes.some(
      (n) => (n.processing?.steps?.length ?? 0) > 0 || (n.routing?.length ?? 0) > 0
    );

    if (!hasWork) {
      const sentinel = 'empty';
      if (this.lastHash !== sentinel) {
        this.logger.info('No wired streams with processing/routing — deleting pipelines config');
        await this.deleteConfig();
        this.lastHash = sentinel;
      }
      return;
    }

    // Hash the content (not the serialised bundle with its fresh exported_at
    // timestamp) so identical stream definitions don't re-push every poll.
    const hash = simpleHash(JSON.stringify(nodes));
    if (hash === this.lastHash) {
      return;
    }
    this.lastHash = hash;

    const bundle = buildBundle(nodes, {
      targetType: this.config.targetType,
      targetId: this.config.targetId,
    });
    const serialised = serialiseBundle(bundle);

    this.logger.info(
      `Stream definitions changed (${nodes.length} streams) — pushing bundle to pipelines-config`
    );
    this.logger.debug(`Bundle: ${serialised}`);
    await this.pushConfig(serialised);
  }

  private async loadWiredStreams(): Promise<WiredStreamDefinition[]> {
    try {
      const response = await this.esClient.search({
        index: STREAMS_INDEX,
        size: 10000,
        sort: [{ name: 'asc' }],
        track_total_hits: false,
      });

      return response.hits.hits.map((hit) => hit._source).filter(isWiredStream);
    } catch (err: unknown) {
      const e = err as { meta?: { statusCode?: number } };
      if (e?.meta?.statusCode === 404) {
        return [];
      }
      throw err;
    }
  }

  private async pushConfig(configString: string): Promise<void> {
    const { pipelinesConfigEndpoint, targetType, targetId } = this.config;
    const url = `${pipelinesConfigEndpoint}/pipelines/${targetType}/${targetId}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: configString }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to push config: ${response.status} ${response.statusText} — ${body}`);
    }

    this.logger.info(`Pushed bundle to ${url}`);
  }

  private async deleteConfig(): Promise<void> {
    const { pipelinesConfigEndpoint, targetType, targetId } = this.config;
    const url = `${pipelinesConfigEndpoint}/pipelines/${targetType}/${targetId}`;

    const response = await fetch(url, { method: 'DELETE' });

    if (!response.ok && response.status !== 404) {
      const body = await response.text();
      throw new Error(
        `Failed to delete config: ${response.status} ${response.statusText} — ${body}`
      );
    }
  }
}

const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return String(hash);
};
