/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { partition } from 'lodash';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { QueryServiceInternalToken } from '../../services/query_service/tokens';
import {
  alreadyNotifiedPairKey,
  getAlreadyNotifiedQueries,
  getMinLastEventTimestamp,
} from '../queries';
import type {
  ActionGroup,
  AlreadyNotifiedRecord,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
} from '../types';

/**
 * Removes from each action group the alerts whose current content an earlier tick already
 * handled (its `notified` records were committed but the tick aborted before recording `fire`),
 * so they are recorded instead of dispatched again. A group whose scheduling failed was handled
 * too: the failed attempt is not retried.
 */
@injectable()
export class ApplyAlreadyNotifiedStep implements DispatcherStep {
  public readonly name = 'apply_already_notified';

  constructor(
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract
  ) {}

  public async execute(
    state: Readonly<DispatcherPipelineState>,
    _: LoggerServiceContract
  ): Promise<DispatcherStepOutput> {
    const { groups = [] } = state;
    if (groups.length === 0) {
      return { type: 'continue' };
    }

    const { signal } = state.input;
    const gte = getMinLastEventTimestamp(groups.flatMap(({ alerts }) => alerts));

    const responses = await Promise.all(
      getAlreadyNotifiedQueries(groups).map((request) =>
        this.queryService.executeQueryRows<AlreadyNotifiedRecord>({
          query: request.query,
          filter: { range: { '@timestamp': { gte } } },
          abortSignal: signal,
        })
      )
    );

    const notifiedThrough = new Map<string, number>();
    for (const row of responses.flat()) {
      notifiedThrough.set(
        alreadyNotifiedPairKey(row.action_group_id, row.alert_id),
        Date.parse(row.notified_through)
      );
    }

    const remainingGroups: ActionGroup[] = [];
    const alreadyNotified: ActionGroup[] = [];
    for (const group of groups) {
      const [covered, uncovered] = partition(group.alerts, (alert) => {
        const through = notifiedThrough.get(alreadyNotifiedPairKey(group.id, alert.alert_id));
        return through !== undefined && through >= Date.parse(alert.last_event_timestamp);
      });
      if (covered.length > 0) alreadyNotified.push({ ...group, alerts: covered });
      if (uncovered.length > 0) remainingGroups.push({ ...group, alerts: uncovered });
    }

    return { type: 'continue', data: { groups: remainingGroups, alreadyNotified } };
  }
}
