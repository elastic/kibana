/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { z } from '@kbn/zod/v4';
import { snoozeConditionSchema, snoozeConditionsMatchSchema } from '@kbn/alerting-v2-schemas';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { QueryServiceInternalToken } from '../../services/query_service/tokens';
import { getAlertEpisodeSuppressionsQueries, getSnoozeBaselineQueries } from '../queries';
import { parseDataJson } from '../parse_episode_data';
import type { AlertEventSeverity } from '../../../resources/datastreams/alert_events';
import type {
  AlertEpisodeSuppression,
  SnoozeBaseline,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
} from '../types';

const conditionsArraySchema = z.array(snoozeConditionSchema);

interface RawSnoozeBaseline {
  rule_id: string;
  group_hash: string;
  severity_as_of: AlertEventSeverity | null;
  data_json_as_of: string | null;
}

const pairKey = (ruleId: string, groupHash: string): string => `${ruleId}::${groupHash}`;

@injectable()
export class FetchSuppressionsStep implements DispatcherStep {
  public readonly name = 'fetch_suppressions';

  constructor(
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract
  ) {}

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { episodes } = state;
    if (!episodes || episodes.length === 0) {
      return { type: 'continue', data: { suppressions: [] } };
    }

    const queries = getAlertEpisodeSuppressionsQueries(episodes);
    const responses = await Promise.all(
      queries.map((request) =>
        this.queryService.executeQueryRows<AlertEpisodeSuppression>({ query: request.query })
      )
    );
    const suppressions = responses.flat().map(parseSnoozeConditions);

    await this.attachSnoozeBaselines(suppressions);

    return { type: 'continue', data: { suppressions } };
  }

  private async attachSnoozeBaselines(suppressions: AlertEpisodeSuppression[]): Promise<void> {
    const conditional = suppressions.filter(
      (s) =>
        s.should_suppress && s.last_snooze_action === 'snooze' && (s.conditions?.length ?? 0) > 0
    );
    if (conditional.length === 0) {
      return;
    }

    const pairKeys = [...new Set(conditional.map((s) => pairKey(s.rule_id, s.group_hash)))];
    const baselineResponses = await Promise.all(
      getSnoozeBaselineQueries(pairKeys).map((request) =>
        this.queryService.executeQueryRows<RawSnoozeBaseline>({ query: request.query })
      )
    );

    const baselineByPair = new Map<string, SnoozeBaseline>();
    for (const row of baselineResponses.flat()) {
      baselineByPair.set(pairKey(row.rule_id, row.group_hash), {
        ...(row.severity_as_of ? { severity: row.severity_as_of } : {}),
        ...(row.data_json_as_of ? { data: parseDataJson(row.data_json_as_of) } : {}),
      });
    }

    for (const suppression of conditional) {
      const baseline = baselineByPair.get(pairKey(suppression.rule_id, suppression.group_hash));
      if (baseline) {
        suppression.baseline = baseline;
      }
    }
  }
}

/**
 * Parses the JSON-encoded `conditions` / `match` columns returned for the last snooze
 * action into typed fields. Non-conditional snoozes (and malformed payloads) are returned unchanged,
 * so downstream suppression falls back to the existing unconditional behavior.
 */
export const parseSnoozeConditions = (
  suppression: AlertEpisodeSuppression
): AlertEpisodeSuppression => {
  if (suppression.last_snooze_action !== 'snooze' || !suppression.conditions_json) {
    return suppression;
  }

  const conditions = safeJsonParse(suppression.conditions_json);
  const parsedConditions = conditionsArraySchema.safeParse(conditions);
  if (!parsedConditions.success || parsedConditions.data.length === 0) {
    return suppression;
  }

  const parsedMatch = suppression.match_json
    ? snoozeConditionsMatchSchema.safeParse(safeJsonParse(suppression.match_json))
    : undefined;

  return {
    ...suppression,
    conditions: parsedConditions.data,
    ...(parsedMatch?.success ? { match: parsedMatch.data } : {}),
  };
};

const safeJsonParse = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};
