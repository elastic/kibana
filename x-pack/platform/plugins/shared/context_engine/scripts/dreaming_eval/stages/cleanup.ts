/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import type { Client } from '@elastic/elasticsearch';
import type { estypes } from '@elastic/elasticsearch';
import { answerAgentOf, datasetDirOf } from '../config';
import type { StageContext } from '../context';
import { aiIndexPath } from './configure';
import { datasetsOf } from './extract';
import { importManifestFileOf } from './import';

const AGENTS_PATH = '/api/agent_builder/agents';
const CONVERSATIONS_PATH = '/api/agent_builder/conversations';
const CONVERSATIONS_PAGE = 1000;
const TRACE_PAGE = 1000;

interface ConversationList {
  results: Array<{ id: string }>;
}

/**
 * Deletes the traces of an agent: every span of each trace one of its spans is in, as only the
 * agent's own spans carry its id. How many spans it deleted.
 */
const deleteAgentTraces = async (
  esClient: Client,
  index: string,
  agentId: string
): Promise<number> => {
  let deleted = 0;
  for (;;) {
    const response = await esClient.search(
      {
        index,
        size: 0,
        query: { term: { 'attributes.gen_ai.agent.id': agentId } },
        aggs: {
          traces: {
            composite: { size: TRACE_PAGE, sources: [{ id: { terms: { field: 'trace_id' } } }] },
          },
        },
        ignore_unavailable: true,
        allow_no_indices: true,
      },
      { ignore: [404] }
    );
    const traces = response.aggregations?.traces as
      | estypes.AggregationsCompositeAggregate
      | undefined;
    const buckets: estypes.AggregationsCompositeBucket[] = Array.isArray(traces?.buckets)
      ? traces?.buckets ?? []
      : [];
    if (buckets.length === 0) {
      return deleted;
    }
    const removed = await esClient.deleteByQuery({
      index,
      query: { terms: { trace_id: buckets.map(({ key }) => String(key.id)) } },
      conflicts: 'proceed',
      refresh: true,
    });
    deleted += removed.deleted ?? 0;
  }
};

/** Deletes every conversation of an agent; how many it deleted. */
const deleteConversations = async (context: StageContext, agentId: string): Promise<number> => {
  let deleted = 0;
  for (;;) {
    const { data } = await context.kibana<ConversationList>(
      'GET',
      `${CONVERSATIONS_PATH}?agent_id=${encodeURIComponent(agentId)}&per_page=${CONVERSATIONS_PAGE}`
    );
    if (data.results.length === 0) {
      return deleted;
    }
    for (const { id } of data.results) {
      await context.kibana('DELETE', `${CONVERSATIONS_PATH}/${encodeURIComponent(id)}`, undefined, {
        allowStatuses: [404],
      });
      deleted++;
    }
  }
};

/**
 * Deletes what the other stages created in Elasticsearch and Kibana: the imported spans, the AI
 * indices with their KIs and workflows, and the answer agents with their conversations. Files
 * stay: downloads, extracts, and the KI dumps and results of every run.
 */
export const runCleanup = async (context: StageContext): Promise<void> => {
  const { config, esClient, kibana, log } = context;
  const aiIndices = config.ai_indices.filter(({ id }) => context.aiIndexIds.includes(id));

  for (const aiIndex of aiIndices) {
    if (aiIndex.answer_agent.enabled) {
      const agent = answerAgentOf(aiIndex);
      const conversations = await deleteConversations(context, agent.id);
      const { status } = await kibana(
        'DELETE',
        `${AGENTS_PATH}/${encodeURIComponent(agent.id)}`,
        undefined,
        { allowStatuses: [404] }
      );
      log.success(
        `${status === 404 ? 'No' : 'Deleted'} agent '${
          agent.id
        }'; deleted ${conversations} of its conversations`
      );
    }

    const { status, data } = await kibana<{ errors?: string[] }>(
      'DELETE',
      `${aiIndexPath(aiIndex.id)}?delete_knowledge_indicators=true&delete_automations=true`,
      undefined,
      { allowStatuses: [404], timeoutMs: 120_000 }
    );
    if (status === 404) {
      log.info(`No AI index '${aiIndex.id}'`);
    } else {
      log.success(`Deleted AI index '${aiIndex.id}' with its KIs and workflows`);
      for (const error of data.errors ?? []) {
        log.warning(`  ${error}`);
      }
    }
  }

  for (const dataset of datasetsOf(context)) {
    const { agent } = config.datasets[dataset];
    const deleted = await deleteAgentTraces(esClient, config.tracesIndex, agent.id);
    fs.rmSync(importManifestFileOf(datasetDirOf(config, dataset)), { force: true });
    log.success(
      `${dataset}: deleted ${deleted} spans of agent '${agent.id}' traces from ${config.tracesIndex}`
    );
  }
};
