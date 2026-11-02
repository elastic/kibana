/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * PoC: coordination/execution seam.
 *
 * Fork of KibanaDiscoveryService re-based from ISavedObjectsRepository onto a
 * raw ElasticsearchClient. `background-task-node` saved objects live in the
 * task manager index (.kibana_task_manager), are namespace-agnostic and have
 * flat attributes ({ id, last_seen }), so the raw-document equivalent of the
 * repository calls is small:
 *   - update+upsert  -> _update with doc_as_upsert on 'background-task-node:<id>'
 *   - find(filter)   -> _search with term(type) + range(last_seen)
 *
 * What was CUT relative to the repository-backed original (PoC debt):
 *   - migration/coreMigration version stamping on newly upserted docs
 *   - SO encryption/security extensions (not used by this type anyway)
 *   - `deleteCurrentNode` on shutdown (executor side still owns shutdown)
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { TaskManagerConfig } from '../config';
import { DISCOVERY_INTERVAL_AFTER_BLOCK_EXCEPTION_MS } from '../config';
import { isClusterBlockException } from '../lib/errors';
import type { CoordinatorLogger } from './types';

// Inlined from ../saved_objects to keep the coordinator's import graph free of
// the SO registration machinery.
const BACKGROUND_TASK_NODE_SO_NAME = 'background-task-node';

export const DEFAULT_TIMEOUT = 2000;

interface BackgroundTaskNodeAttributes {
  id: string;
  last_seen: string;
}

interface RawBackgroundTaskNodeSource {
  type: string;
  [BACKGROUND_TASK_NODE_SO_NAME]?: BackgroundTaskNodeAttributes;
}

export interface CoordinatorDiscoveryServiceOpts {
  config: TaskManagerConfig['discovery'];
  currentNode: string;
  esClient: ElasticsearchClient;
  /** Index holding background-task-node saved objects (the TM index). */
  index: string;
  logger: CoordinatorLogger;
  onNodesCounted?: (numOfNodes: number) => void;
}

export interface ActiveNode {
  attributes: BackgroundTaskNodeAttributes;
}

export class CoordinatorDiscoveryService {
  private readonly activeNodesLookBack: string;
  private readonly discoveryInterval: number;
  private readonly currentNode: string;
  private readonly esClient: ElasticsearchClient;
  private readonly index: string;
  private readonly logger: CoordinatorLogger;
  private readonly onNodesCounted?: (numOfNodes: number) => void;
  private started = false;
  private stopped = false;
  private timer: NodeJS.Timeout | undefined;

  constructor(opts: CoordinatorDiscoveryServiceOpts) {
    this.activeNodesLookBack = opts.config.active_nodes_lookback;
    this.discoveryInterval = opts.config.interval;
    this.currentNode = opts.currentNode;
    this.esClient = opts.esClient;
    this.index = opts.index;
    this.logger = opts.logger;
    this.onNodesCounted = opts.onNodesCounted;
  }

  public isStarted() {
    return this.started;
  }

  public async start() {
    if (!this.started) {
      await this.scheduleUpsertCurrentNode();
    } else {
      this.logger.warn('Coordinator discovery service has already been started');
    }
  }

  public stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }

  public async getActiveKibanaNodes(): Promise<ActiveNode[]> {
    const result = await this.esClient.search<RawBackgroundTaskNodeSource>({
      index: this.index,
      size: 10000,
      query: {
        bool: {
          filter: [
            { term: { type: BACKGROUND_TASK_NODE_SO_NAME } },
            {
              range: {
                [`${BACKGROUND_TASK_NODE_SO_NAME}.last_seen`]: {
                  gt: `now-${this.activeNodesLookBack}`,
                },
              },
            },
          ],
        },
      },
    });

    const nodes: ActiveNode[] = [];
    for (const hit of result.hits.hits as Array<
      estypes.SearchHit<RawBackgroundTaskNodeSource>
    >) {
      const attributes = hit._source?.[BACKGROUND_TASK_NODE_SO_NAME];
      if (attributes) nodes.push({ attributes });
    }

    if (this.onNodesCounted) this.onNodesCounted(nodes.length);
    return nodes;
  }

  private async upsertCurrentNode(lastSeen: string) {
    const attributes: BackgroundTaskNodeAttributes = { id: this.currentNode, last_seen: lastSeen };
    await this.esClient.update(
      {
        index: this.index,
        id: `${BACKGROUND_TASK_NODE_SO_NAME}:${this.currentNode}`,
        doc: { [BACKGROUND_TASK_NODE_SO_NAME]: attributes, updated_at: lastSeen },
        upsert: {
          type: BACKGROUND_TASK_NODE_SO_NAME,
          [BACKGROUND_TASK_NODE_SO_NAME]: attributes,
          references: [],
          updated_at: lastSeen,
        },
        refresh: false,
      },
      { retryOnTimeout: false }
    );
  }

  private async scheduleUpsertCurrentNode() {
    let retryInterval = this.discoveryInterval;
    if (this.stopped) return;
    const lastSeenDate = new Date();
    const lastSeen = lastSeenDate.toISOString();
    try {
      await this.upsertCurrentNode(lastSeen);
      if (!this.started) {
        this.logger.info('Coordinator discovery service has been started (raw-ES fork)');
        this.started = true;
      }
    } catch (e) {
      if (isClusterBlockException(e)) {
        retryInterval = DISCOVERY_INTERVAL_AFTER_BLOCK_EXCEPTION_MS;
      }
      this.logger.error(
        `Coordinator discovery service couldn't update this node's last_seen. id: ${this.currentNode}, error: ${e.message}`
      );
    } finally {
      this.timer = setTimeout(
        () => void this.scheduleUpsertCurrentNode(),
        Math.max(retryInterval - (Date.now() - lastSeenDate.getTime()), DEFAULT_TIMEOUT)
      );
    }
  }
}
