/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { FakeRequestEnricher } from '@kbn/core-security-server';
import { markExternalUiamCredential } from '@kbn/core-security-server';
import { brandSpaceId } from '@kbn/core-spaces-common';
import { POD_REQUEST_MARKER } from './wire';
import type { PodRequestIdentity } from './wire';
import { PodContractNotFoundError } from './pod_contract_not_found_error';

/** What a remote-contract handler can see about the run that is calling it. */
export interface PodContractContext {
  executionUuid: string;
  taskType: string;
  logger: Logger;
  /** The run's identity: same fake request Task Manager would hand a local `createTaskRunner`. */
  getFakeRequest: () => KibanaRequest | undefined;
  /** Registers cleanup (closing finders, etc.) to run when the run ends. */
  onRunEnd: (cleanup: () => void | Promise<void>) => void;
}

export type PodContractHandler = (ctx: PodContractContext, ...args: unknown[]) => Promise<unknown>;
export type PodContractHandlers = Record<string, PodContractHandler>;

interface ActiveRun {
  context: PodContractContext;
  cleanups: Array<() => void | Promise<void>>;
}

/** Rebuilds the fake requests a pod encoded into a call's arguments (see `encodePodArgs`). */
const decodePodArgs = (args: unknown[], enrichFakeRequest?: FakeRequestEnricher): unknown[] =>
  JSON.parse(JSON.stringify(args), (_key, value) => {
    const identity: PodRequestIdentity | undefined =
      value && typeof value === 'object' ? value[POD_REQUEST_MARKER] : undefined;
    if (!identity) return value;
    const request = kibanaRequestFactory({
      headers: identity.authorization ? { authorization: identity.authorization } : {},
      ...(identity.spaceId ? { spaceId: brandSpaceId(identity.spaceId) } : {}),
    } as never);
    // Same treatment `buildTaskFakeRequest` gives a task's own request, so a contract behaves for a
    // pod's request exactly as it would for the task running in Kibana.
    if (identity.uiamApiKeyExternal === true) markExternalUiamCredential(request);
    if ((identity.userProfileId || identity.userName) && enrichFakeRequest) {
      enrichFakeRequest(request, {
        profileId: identity.userProfileId,
        username: identity.userName,
      });
    }
    return request;
  });

/**
 * Plugins register the methods of their own contracts that a pod may call back into. Only
 * registered methods are callable: the allowlist is the security boundary. A run-scoped token
 * (valid only while that run is in flight) is the credential.
 */
export class PodContractRegistry {
  private readonly handlers = new Map<string, PodContractHandlers>();
  private readonly runs = new Map<string, ActiveRun>();

  constructor(
    private readonly logger: Logger,
    private readonly getFakeRequestEnricher: () => FakeRequestEnricher | undefined = () => undefined
  ) {}

  public register(pluginId: string, handlers: PodContractHandlers) {
    if (this.handlers.has(pluginId)) {
      throw new Error(`Pod contract for '${pluginId}' is already registered`);
    }
    this.handlers.set(pluginId, handlers);
  }

  public startRun(params: {
    executionUuid: string;
    taskType: string;
    getFakeRequest: () => KibanaRequest | undefined;
  }): string {
    const token = randomUUID();
    const run: ActiveRun = {
      cleanups: [],
      context: {
        ...params,
        logger: this.logger,
        onRunEnd: (cleanup) => run.cleanups.push(cleanup),
      },
    };
    this.runs.set(token, run);
    return token;
  }

  public async endRun(token: string) {
    const run = this.runs.get(token);
    this.runs.delete(token);
    for (const cleanup of run?.cleanups ?? []) {
      try {
        await cleanup();
      } catch (error) {
        this.logger.warn(`Pod contract cleanup failed: ${(error as Error).message}`);
      }
    }
  }

  public async invoke(token: string, pluginId: string, method: string, args: unknown[]) {
    const run = this.runs.get(token);
    const handler = this.handlers.get(pluginId)?.[method];
    if (!run || !handler) {
      throw new PodContractNotFoundError(
        run ? `No pod contract '${pluginId}.${method}'` : 'Unknown or expired run token'
      );
    }
    this.logger.debug(
      `pod contract call ${pluginId}.${method} (execution ${run.context.executionUuid})`
    );
    return handler(run.context, ...decodePodArgs(args, this.getFakeRequestEnricher()));
  }
}
