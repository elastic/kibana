/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * RESEARCH ONLY (Track 2 islands): a workflow step contributed by a plugin that stays on main.
 * `research.spin` burns `doseMs` of CPU wherever its handler runs and reports the isolate.
 *
 * With KBN_RESEARCH_ISLAND_STEP_MODULE=true the definition carries a module-specifier marker
 * (Symbol.for('kbn.research.islandModule')): the island RPC then sends the specifier instead of
 * a handle and the receiving isolate loads this module itself, so the handler runs where the
 * registry lives (the "registries by module specifier" hypothesis).
 */

import { threadId } from 'worker_threads';
import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';

export const RESEARCH_SPIN_STEP_ID = 'research.spin';

const spin = (doseMs: number): number => {
  const t0 = Date.now();
  let x = 0;
  while (Date.now() - t0 < doseMs) x += Math.sqrt(x + 1);
  return Date.now() - t0 + (x > -1 ? 0 : 1);
};

export const researchSpinStepDefinition = {
  id: RESEARCH_SPIN_STEP_ID,
  category: StepCategory.Data,
  label: 'Research spin',
  description: 'RESEARCH ONLY: burns CPU for doseMs in the isolate that runs the handler.',
  inputSchema: z.object({ doseMs: z.number().min(0).max(60000) }),
  outputSchema: z.object({ ms: z.number(), pid: z.number(), threadId: z.number() }),
  handler: async (context: { input: { doseMs: number } }) => ({
    output: { ms: spin(context.input.doseMs), pid: process.pid, threadId },
  }),
};

if (process.env.KBN_RESEARCH_ISLAND_STEP_MODULE === 'true') {
  Object.defineProperty(researchSpinStepDefinition, Symbol.for('kbn.research.islandModule'), {
    value: { specifier: __filename, export: 'researchSpinStepDefinition' },
  });
}
