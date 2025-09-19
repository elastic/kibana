/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export async function withLoghubSynthtrace<T>(
  {
    start,
    end,
    esClient,
    logger,
  }: {
    start: number;
    end: number;
    esClient: ElasticsearchClient;
    logger: Logger;
  },
  cb: () => Promise<T>
) {
  await execa.command(
    `node scripts/synthtrace.js sample_logs --from=${new Date(start).toISOString()} --to=${new Date(
      end
    ).toISOString()} --assume-package-version=9.0.0`,
    {
      cwd: REPO_ROOT,
      stdout: 'ignore',
    }
  );

  logger.info('Indexed historical data');

  await esClient.indices.refresh({
    index: 'logs*',
  });

  const live = execa.command(
    `node scripts/synthtrace.js sample_logs --live --assume-package-version=9.0.0`,
    {
      cwd: REPO_ROOT,
    }
  );

  return await cb().finally(() => {
    logger.info(`Killing synthtrace with SIGTERM`);
    live.kill('SIGTERM');

    setTimeout(() => {
      logger.info(`Killing synthtrace forcefully`);
      live.kill('SIGKILL');
    }, 10000).unref();
  });
}
