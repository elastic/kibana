/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import { range } from 'lodash';
import pLimit from 'p-limit';

class AbortError extends Error {
  constructor() {
    super('Aborted');
    super.name = 'AbortError';
  }
}

/**
 * Runs command n times, in parallel, until completion,
 * or until abort signal is triggered.
 *
 * Executes commands until all have settled, rather than
 * throwing on the first rejection. If at least one command
 * fails, or the abort signal is triggered, the function will
 * throw an error.
 */
export async function runCommand({
  command,
  amount,
  connections,
  signal,
}: {
  command: string[];
  amount: number;
  connections: number;
  signal: AbortSignal;
}) {
  const abortPromise = new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new AbortError());
      return;
    }
    signal.addEventListener('abort', () => {
      reject(new AbortError());
    });
  });

  function executeCommand() {
    const [file, ...args] = command;
    return execa(file, args, { stdio: 'ignore' });
  }

  if (amount === 1) {
    return await Promise.race([abortPromise, executeCommand()]);
  }

  const limiter = pLimit(connections);

  await Promise.allSettled(
    range(0, amount).map(async (index) => {
      await limiter(() => {
        return Promise.race([abortPromise, executeCommand()]);
      });
    })
  ).then((results) => {
    const errors = results.flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : []
    );
    if (errors.length) {
      throw new AggregateError(errors, `Some executions failed`);
    }
  });
}
