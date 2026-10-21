/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join } from 'node:path';
import { readFileSync } from 'node:fs';

import { planDashboard } from '.';

// Jest's own serializer, which the recorded Vitest snapshots were written with.
const { format } = jest.requireActual<typeof import('pretty-format')>('pretty-format');

const fixture = (name: string) => readFileSync(join(__dirname, `../fixtures/${name}`), 'utf8');

const DASHBOARDS = [
  ['web_logs_slice.ndjson', 'alembic-web-logs-slice'],
  ['web_logs_sample.ndjson', 'edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b'],
] as const;

/**
 * What the converter must keep producing: every panel's ES|QL, chart metadata, and dimensions, and the spec.
 * Recorded from Alembic's converter, then extended where the lowering keeps more of Lens than it did: a data table
 * column's \`valueColor\`, \`width\` and \`center\` alignment.
 */
describe('planDashboard snapshot', () => {
  it.each(DASHBOARDS)('%s plans as recorded', async (file, id) => {
    for (const timeRange of [undefined, { from: 'now-7d', to: 'now' }]) {
      const { title, spec, panels, vegaPanels, diagnostics } = planDashboard(
        fixture(file),
        id,
        timeRange ? { timeRange } : {}
      );
      const recorded = readFileSync(
        join(
          __dirname,
          `../fixtures/__snapshots__/${file.replace('.ndjson', '')}${
            timeRange ? '.7d' : ''
          }.plan.json`
        ),
        'utf8'
      );
      // The recorded files are Vitest file snapshots: pretty-format without prototypes or string escapes.
      const actual = format(
        {
          title,
          spec,
          diagnostics,
          panels: panels.map(({ panelId, queryId, binding, query, dimensions }) => ({
            panelId,
            queryId,
            binding,
            query,
            dimensions,
          })),
          vegaPanels,
        },
        { escapeString: false, printBasicPrototype: false, indent: 2 }
      );
      expect(actual).toBe(recorded.trimEnd());
    }
  });
});
