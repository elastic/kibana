/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import { createInterface } from 'readline';
import type { Observable } from 'rxjs';
import { Subject, lastValueFrom } from 'rxjs';

function extendNodeOptions(existing: string | undefined, inspectorPort: number) {
  const debugOpt = `--inspect-wait=${inspectorPort}`;
  return existing ? `${existing} ${debugOpt}` : debugOpt;
}

export async function runInspectableProcess({
  args,
  file,
  inspectorPort,
  log,
  signal,
}: {
  file: string;
  args: string[];
  inspectorPort: number;
  log: ToolingLog;
  signal: AbortSignal;
}): Promise<{ pid: number; close$: Observable<void> }> {
  log.info(`Spawning command "${file} ${args.join(' ')}"`);
  const cmd = execa(file, args, {
    extendEnv: true,
    env: { NODE_OPTIONS: extendNodeOptions(process.env.NODE_OPTIONS, inspectorPort) },
    stdout: 'inherit',
    stderr: 'pipe',
  });

  const open$ = new Subject<void>();
  const close$ = new Subject<void>();

  const rl = createInterface({ input: cmd.stderr! });
  rl.on('line', (line) => {
    log.debug(`Line output: >>> ${line}`);
    if (line.includes('Debugger listening on ws://')) {
      open$.next();
      open$.complete();
    } else if (line.includes('Waiting for the debugger to disconnect')) {
      close$.next();
      close$.complete();
    } else if (line.includes('address already in use')) {
      const error = new Error(line);
      open$.error(error);
      close$.error(error);
    }
  });

  signal.addEventListener('abort', () => {
    cmd.kill();
  });

  await lastValueFrom(open$);

  return {
    pid: cmd.pid!,
    close$,
  };
}
