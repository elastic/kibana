/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as sleep } from 'timers/promises';
import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { escapeKuery } from '@kbn/es-query';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { Agent } from '@kbn/fleet-plugin/common';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  PrivateLocationExecuteParams,
  PrivateLocationHttpResponse,
  PrivateLocationRunner,
} from '@kbn/stack-connectors-plugin/server';

export const WORKFLOW_HTTP_INPUT_TYPE = 'workflow/http';
export const RESULT_INDEX_PATTERN = 'logs-workflow_runner.http-*';

const DEFAULT_TIMEOUT_SECONDS = 60;
const MAX_TIMEOUT_SECONDS = 3600;
const MAX_AGENTS_PER_LOCATION = 100;
// How long Fleet Server keeps offering the action to the agent before it expires undelivered.
const DELIVERY_TIMEOUT_MS = 60_000;
// Slack after the request timeout for the agent to ack and index the result.
const RESULT_GRACE_MS = 30_000;
const INITIAL_POLL_INTERVAL_MS = 500;
const MAX_POLL_INTERVAL_MS = 2_000;

export interface RunnerStartServices {
  fleet: FleetStartContract;
  spaces?: SpacesPluginStart;
  esClient: ElasticsearchClient;
}

interface WorkflowHttpResultDoc {
  http?: {
    response?: {
      status_code?: number;
      headers?: Record<string, string | string[]>;
      body?: { content?: string; truncated?: boolean };
    };
  };
  error?: { message?: string };
}

const hasHealthyRunner = ({ components }: Agent): boolean =>
  (components ?? []).some(
    ({ type, status }) => type === WORKFLOW_HTTP_INPUT_TYPE && status === 'HEALTHY'
  );

const clampTimeoutSeconds = (timeoutSeconds: number | undefined): number =>
  Math.min(Math.max(Math.ceil(timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS), 1), MAX_TIMEOUT_SECONDS);

const toLowerCaseHeaders = (
  headers: Record<string, string | string[]> | undefined
): Record<string, string> =>
  Object.entries(headers ?? {}).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
    return acc;
  }, {});

/** Runs private location requests on Elastic Agents through Fleet `INPUT_ACTION`s. */
export class FleetPrivateLocationRunner implements PrivateLocationRunner {
  private readonly logger: Logger;
  private readonly getStartServices: () => Promise<RunnerStartServices>;

  constructor({
    logger,
    getStartServices,
  }: {
    logger: Logger;
    getStartServices: () => Promise<RunnerStartServices>;
  }) {
    this.logger = logger;
    this.getStartServices = getStartServices;
  }

  public async execute({
    privateLocation,
    connectorId,
    request,
    kibanaRequest,
    signal,
  }: PrivateLocationExecuteParams): Promise<PrivateLocationHttpResponse> {
    const { fleet, spaces, esClient } = await this.getStartServices();
    const spaceId =
      kibanaRequest && spaces ? spaces.spacesService.getSpaceId(kibanaRequest) : DEFAULT_SPACE_ID;

    const agentId = await this.selectAgent({ fleet, spaceId, privateLocation });
    const timeoutSeconds = clampTimeoutSeconds(request.timeoutSeconds);
    const actionId = uuidv4();
    const createdAt = Date.now();
    const actionsClient = fleet.createFleetActionsClient(WORKFLOW_HTTP_INPUT_TYPE);

    await actionsClient.create({
      action_id: actionId,
      '@timestamp': new Date(createdAt).toISOString(),
      expiration: new Date(createdAt + DELIVERY_TIMEOUT_MS).toISOString(),
      type: 'INPUT_ACTION',
      input_type: WORKFLOW_HTTP_INPUT_TYPE,
      agents: [agentId],
      timeout: timeoutSeconds,
      user_id: undefined,
      data: {
        space_id: spaceId,
        request: {
          method: request.method,
          url: request.url,
          headers: request.headers,
          ...(request.body !== undefined ? { body: request.body } : {}),
          ...(request.maxRedirects !== undefined ? { max_redirects: request.maxRedirects } : {}),
          ...(request.maxResponseBytes !== undefined
            ? { max_response_bytes: request.maxResponseBytes }
            : {}),
        },
      },
    });
    this.logger.debug(
      `Connector "${connectorId}": sent action "${actionId}" to agent "${agentId}" in private location "${privateLocation}"`
    );

    const deadline = createdAt + DELIVERY_TIMEOUT_MS + timeoutSeconds * 1000 + RESULT_GRACE_MS;
    return this.waitForResult({ fleet, esClient, actionId, privateLocation, deadline, signal });
  }

  private async selectAgent({
    fleet,
    spaceId,
    privateLocation,
  }: {
    fleet: FleetStartContract;
    spaceId: string;
    privateLocation: string;
  }): Promise<string> {
    const { agents } = await fleet.agentService.asInternalScopedUser(spaceId).listAgents({
      kuery: `policy_id:${escapeKuery(privateLocation)} and status:online`,
      showInactive: false,
      perPage: MAX_AGENTS_PER_LOCATION,
    });

    const candidates = agents.filter(hasHealthyRunner);
    if (candidates.length === 0) {
      throw new Error(
        `no online agent with a healthy workflow runner in private location "${privateLocation}"`
      );
    }
    return candidates[Math.floor(Math.random() * candidates.length)].id;
  }

  private async waitForResult({
    fleet,
    esClient,
    actionId,
    privateLocation,
    deadline,
    signal,
  }: {
    fleet: FleetStartContract;
    esClient: ElasticsearchClient;
    actionId: string;
    privateLocation: string;
    deadline: number;
    signal?: AbortSignal;
  }): Promise<PrivateLocationHttpResponse> {
    const actionsClient = fleet.createFleetActionsClient(WORKFLOW_HTTP_INPUT_TYPE);
    let acknowledged = false;

    for (let attempt = 0; ; attempt++) {
      signal?.throwIfAborted();

      if (!acknowledged) {
        const {
          items: [ack],
        } = await actionsClient.getResultsByIds([actionId]);
        const ackResponse = ack?.action_response?.[WORKFLOW_HTTP_INPUT_TYPE] as
          | { status_code?: number }
          | undefined;
        if (ack?.error && ackResponse?.status_code === undefined) {
          throw new Error(`agent "${ack.agent_id}" failed the request: ${ack.error}`);
        }
        acknowledged = ack !== undefined;
      }

      // The result document is indexed before the ack, but may not be searchable yet.
      if (acknowledged) {
        const resultDoc = await this.getResultDoc(esClient, actionId);
        if (resultDoc) {
          return this.toResponse(resultDoc);
        }
      }

      if (Date.now() >= deadline) {
        throw new Error(
          acknowledged
            ? `result of action "${actionId}" was not found`
            : `timed out waiting for private location "${privateLocation}" to run action "${actionId}"`
        );
      }

      await sleep(
        Math.min(INITIAL_POLL_INTERVAL_MS * 2 ** attempt, MAX_POLL_INTERVAL_MS),
        undefined,
        {
          signal,
        }
      );
    }
  }

  private async getResultDoc(
    esClient: ElasticsearchClient,
    actionId: string
  ): Promise<WorkflowHttpResultDoc | undefined> {
    const { hits } = await esClient.search<WorkflowHttpResultDoc>({
      index: RESULT_INDEX_PATTERN,
      size: 1,
      ignore_unavailable: true,
      allow_no_indices: true,
      query: { ids: { values: [actionId] } },
    });
    return hits.hits[0]?._source;
  }

  private toResponse({ http, error }: WorkflowHttpResultDoc): PrivateLocationHttpResponse {
    const statusCode = http?.response?.status_code;
    if (statusCode === undefined) {
      throw new Error(error?.message ?? 'the agent returned no response');
    }
    return {
      statusCode,
      headers: toLowerCaseHeaders(http?.response?.headers),
      body: http?.response?.body?.content,
      bodyTruncated: http?.response?.body?.truncated ?? false,
    };
  }
}
