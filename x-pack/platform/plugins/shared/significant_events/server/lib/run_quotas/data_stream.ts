/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamDefinition } from '@kbn/data-streams';
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';

/**
 * Append-only ledger of Significant Events workflow runs that reached the daily
 * run-quota gate. One document per run, written by the gate preamble of the
 * counted workflow itself and labelled `admitted` or `refused`.
 *
 * This is deliberately not `.workflows-executions`: workflow Elasticsearch
 * steps run with the caller's own credentials (no access to that system index),
 * and a workflow that counted its own executions would count the gated run it
 * is deciding about. A Nightshift-owned index avoids both problems and lets
 * non-workflow run paths join the same counter later.
 */
export const RUN_LEDGER_DATA_STREAM = '.significant_events-runs';

/** Only admitted runs consume budget; refused ones are recorded for reporting. */
export const RUN_OUTCOME_ADMITTED = 'admitted';
export const RUN_OUTCOME_REFUSED = 'refused';

export const runLedgerMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date({ format: 'strict_date_optional_time' }),
    /** Budget group the run consumed; the counter is per group. */
    budget_group: mappings.keyword(),
    /** Engine the group belongs to, denormalised for per-engine reporting. */
    engine: mappings.keyword(),
    /**
     * `admitted` when the run went on to do its work, `refused` when the gate
     * stopped it. Only `admitted` counts towards the limit, so a day spent at
     * the cap does not inflate its own usage.
     */
    outcome: mappings.keyword(),
    workflow_id: mappings.keyword(),
    execution_id: mappings.keyword(),
    /**
     * Root origin of the run (`scheduled`, `workflow-step`, `manual`, …).
     * Parents forward theirs so a human-initiated chain is attributed to the
     * person, not to the intermediate workflow step.
     */
    triggered_by: mappings.keyword(),
    // `kibana.space_ids` is not declared here: the data-streams framework injects
    // it into every data stream's template automatically, and declaring it too
    // trips `applyDefaults`'s reserved-key check, which throws and silently takes
    // down this template install (Promise.allSettled swallows the rejection).
  },
} satisfies MappingsDefinition;

export type StoredRunLedgerEntry = GetFieldsOf<typeof runLedgerMappings>;

export const runLedgerDataStream: DataStreamDefinition<
  typeof runLedgerMappings,
  StoredRunLedgerEntry
> = {
  name: RUN_LEDGER_DATA_STREAM,
  version: 1,
  hidden: true,
  template: {
    priority: 500,
    // Quotas only ever look at the current day. A month keeps enough history to
    // explain "why did this stop yesterday?" without growing unbounded.
    lifecycle: { data_retention: '30d' },
    mappings: runLedgerMappings,
  },
};
