/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import type { Client } from '@elastic/elasticsearch';
import { logger } from '../cases_generator/logger';
import { ALERTING_CASES_INDEX } from '../observables_load_test/probe';
import type { Requester } from '../observables_load_test/shared';
import { createProbeRule } from '../observables_load_test/shared';
import type { BenchmarkConfig } from './config';
import { findProbeRuleId, getIndexStats, getObjectCounts, getTypeVersionCounts } from './es_stats';
import { PROBE_TAG } from './upgrade';

/**
 * Readies a dataset for upgrade runs while the old Kibana still runs: creates the disabled probe
 * rule the upgrade mode rewrites (Kibana is down during a v2 migration, so it can't create one
 * then) and records the dataset the runs start from.
 */
export const runPrepare = async (
  es: Client,
  request: Requester,
  config: BenchmarkConfig
): Promise<void> => {
  const existing = await findProbeRuleId(es, PROBE_TAG);
  const probeRuleId = existing ?? (await createProbeRule(request, PROBE_TAG)).id;
  logger.info(`${existing != null ? 'Reusing' : 'Created'} probe rule ${probeRuleId}`);

  await es.indices.refresh({ index: ALERTING_CASES_INDEX });
  const [index, counts, versions] = await Promise.all([
    getIndexStats(es),
    getObjectCounts(es),
    getTypeVersionCounts(es),
  ]);

  const out = path.join(config.out, `prepare-${config.label}.json`);
  fs.mkdirSync(config.out, { recursive: true });
  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        label: config.label,
        takenAt: new Date().toISOString(),
        probeRuleId,
        index,
        counts,
        versions,
      },
      null,
      2
    )
  );
  logger.success(`Dataset recorded in ${out}: cases-attachments ${JSON.stringify(versions)}`);
};
