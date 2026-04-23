/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { inject, injectable } from 'inversify';
import { Logger as PluginLogger, PluginStart } from '@kbn/core-di';
import { Request } from '@kbn/core-di-server';
import type { Logger } from '@kbn/logging';
import { defer, timer, switchMap, map, distinctUntilChanged, takeWhile, share } from 'rxjs';
import type { Observable } from 'rxjs';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import type { ServerSentEvent } from '@kbn/sse-utils/src/events';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { RuleDoctorWorkflowServiceToken } from '../../workflows/tokens';
import type {
  RuleDoctorWorkflowService,
  RuleDoctorExecutionSummary,
} from '../../workflows/rule_doctor_workflow';
import { EsServiceInternalToken } from '../../lib/services/es_service/tokens';
import type { AlertingServerStartDependencies } from '../../types';
import { enrichExecutionsWithDataViewNames } from './enrich_executions';

const POLL_INTERVAL_MS = 2000;
const STALE_THRESHOLD_MS = 15 * 60 * 1000;
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'timed_out', 'skipped']);

const isEffectivelyTerminal = (execution: { status: string; startedAt: string }): boolean => {
  if (TERMINAL_STATUSES.has(execution.status)) return true;
  const age = Date.now() - new Date(execution.startedAt).getTime();
  return age > STALE_THRESHOLD_MS;
};

interface ExecutionUpdateEvent extends ServerSentEvent {
  type: 'executionUpdate';
  executions: RuleDoctorExecutionSummary[];
}

@injectable()
export class StreamExecutionsRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = '/internal/alerting/v2/rule_doctor/executions/_stream';
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Stream Rule Doctor execution updates via SSE',
  };
  static validate = {
    request: {},
    response: {},
  };

  protected readonly routeName = 'stream rule doctor executions';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request) private readonly request: KibanaRequest,
    @inject(PluginLogger) private readonly logger: Logger,
    @inject(RuleDoctorWorkflowServiceToken)
    private readonly ruleDoctorService: RuleDoctorWorkflowService,
    @inject(EsServiceInternalToken)
    private readonly esClient: ElasticsearchClient,
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: SpacesPluginStart
  ) {
    super(ctx);
  }

  protected async execute() {
    const abortController = new AbortController();
    this.request.events.aborted$.subscribe(() => {
      abortController.abort();
    });

    const spaceId = this.spaces.spacesService.getSpaceId(this.request);

    const executions$: Observable<ExecutionUpdateEvent> = defer(() =>
      timer(0, POLL_INTERVAL_MS)
    ).pipe(
      switchMap(async () => {
        const executions = await this.ruleDoctorService.listExecutions({ spaceId });
        await enrichExecutionsWithDataViewNames(executions, this.esClient);
        return executions;
      }),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      map(
        (executions): ExecutionUpdateEvent => ({
          type: 'executionUpdate' as const,
          executions,
        })
      ),
      takeWhile((event, index) => {
        if (index === 0) return true;
        return event.executions.some((e) => !isEffectivelyTerminal(e));
      }, true),
      share()
    );

    const body = observableIntoEventSourceStream(executions$ as Observable<ServerSentEvent>, {
      signal: abortController.signal,
      logger: this.logger,
    });

    return this.ctx.response.ok({
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
      body,
    });
  }
}
