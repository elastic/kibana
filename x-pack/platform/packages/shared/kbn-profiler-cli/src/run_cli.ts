/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { run } from '@kbn/dev-cli-runner';
import { runProfiler } from './run_profiler';
import { DEFAULT_INSPECTOR_PORT, NO_GREP } from './flags';

export function cli() {
  run(runProfiler, {
    flags: {
      string: [
        'port',
        'pid',
        't',
        'timeout',
        'c',
        'connections',
        'a',
        'amount',
        'grep',
        'inspector-port',
      ] as const,
      boolean: ['heap', 'spawn'] as const,
      help: `
          Usage: node scripts/profiler.js <args> <command>

          --port              Port on which Kibana is running. Falls back to 5603 & 5601.
          --pid               Process ID to hook into it. Takes precedence over \`port\`.
          --t, --timeout      Run commands until timeout (in milliseconds)
          --c, --connections  Number of commands that can be run in parallel.
          --a, --amount       Amount of times the command should be run
          --heap              Collect a heap snapshot
          --grep              Grep through running Node.js processes
          --spawn             Spawn and profile a new Node.js process until completion
          --inspector-port    Port at which the inspector will be running. Defaults to ${DEFAULT_INSPECTOR_PORT}
        `,
      default: {
        grep: NO_GREP,
      },
      allowUnexpected: false,
    },
  });
}
