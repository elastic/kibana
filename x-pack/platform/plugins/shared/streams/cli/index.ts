/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RunWithCommands } from '@kbn/dev-cli-runner';
import { GLOBAL_FLAGS, type CliContext } from './types';
import { extendContext } from './context';

// Core stream commands
import { listCommand } from './commands/list';
import { getCommand } from './commands/get';
import { upsertCommand } from './commands/upsert';
import { deleteCommand } from './commands/delete';
import { forkCommand } from './commands/fork';
import { statusCommand } from './commands/status';
import { enableCommand } from './commands/enable';
import { disableCommand } from './commands/disable';
import { resyncCommand } from './commands/resync';

// Ingest commands
import { ingestGetCommand, ingestSetCommand } from './commands/ingest';

// Features commands
import {
  featuresListCommand,
  featuresUpsertCommand,
  featuresDeleteCommand,
  featuresBulkCommand,
  featuresIdentifyCommand,
} from './commands/features';

// Significant events commands
import {
  significantEventsReadCommand,
  significantEventsPreviewCommand,
  significantEventsGenerateCommand,
  significantEventsTaskCommand,
} from './commands/significant_events';

// Interactive mode
import { interactiveCommand } from './commands/interactive';

export function run() {
  new RunWithCommands<CliContext>({
    description: 'Streams CLI - Manage Elasticsearch streams from the command line',
    usage: 'node scripts/streams_cli <command> [options]',
    globalFlags: GLOBAL_FLAGS,
    extendContext,
  })
    // Interactive mode
    .command(interactiveCommand)

    // Core stream commands
    .command(listCommand)
    .command(getCommand)
    .command(upsertCommand)
    .command(deleteCommand)
    .command(forkCommand)
    .command(statusCommand)
    .command(enableCommand)
    .command(disableCommand)
    .command(resyncCommand)

    // Ingest commands
    .command(ingestGetCommand)
    .command(ingestSetCommand)

    // Features commands
    .command(featuresListCommand)
    .command(featuresUpsertCommand)
    .command(featuresDeleteCommand)
    .command(featuresBulkCommand)
    .command(featuresIdentifyCommand)

    // Significant events commands
    .command(significantEventsReadCommand)
    .command(significantEventsPreviewCommand)
    .command(significantEventsGenerateCommand)
    .command(significantEventsTaskCommand)

    .execute();
}
