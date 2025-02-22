/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { getParser } from '../src/get_parser';
import { LoghubSystem } from '../src/read_loghub_system_files';
import { validateParser } from '../src/validate_parser';
import { StreamLogGenerator } from './types';
import { createLoghubGenerator } from './create_loghub_generator';

export function getLoghubGeneratorFactory({
  system,
  log,
}: {
  system: LoghubSystem;
  log: ToolingLog;
}): () => Promise<StreamLogGenerator> {
  const get = once(async () => {
    await validateParser(system);
    const parser = await getParser(system);
    const min = parser.getTimestamp(system.logLines[0]);
    const max = parser.getTimestamp(system.logLines[system.logLines.length - 1]);

    return {
      ...parser,
      min,
      max,
    };
  });

  return async (): Promise<StreamLogGenerator> => {
    const parser = await get();
    const generator = createLoghubGenerator({
      system,
      parser,
      log,
    });

    return generator;
  };
}
