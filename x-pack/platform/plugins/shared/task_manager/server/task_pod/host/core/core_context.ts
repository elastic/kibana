/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { ConfigService, Env } from '@kbn/config';
import { REPO_ROOT } from '@kbn/repo-info';
import { kibanaPackageJson } from '@kbn/repo-info';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { Logger } from '@kbn/logging';
import type { PodLogger } from '../logger';
import { POD_KIBANA_VERSION } from '../version';

/**
 * Core's own `Env` and `ConfigService` over the pod's merged config (`POD_CONFIG`, keystore, the
 * family's base config) instead of kibana.yml, and the `CoreContext` every real Core service takes.
 *
 * Differences from a Kibana process, on purpose:
 * - `packageInfo.version` is the pod's `POD_KIBANA_VERSION` and `dist` is `true`: a pod behaves like
 *   a built Kibana even when started from source (the same values plugins saw before).
 * - the config comes from an object, not from files, so there is no file watching, CLI parsing or
 *   deprecation logging.
 */
export const createPodCoreContext = ({
  config,
  logger,
}: {
  config: Record<string, unknown>;
  logger: PodLogger;
}): CoreContext => {
  const env = Env.createDefault(
    REPO_ROOT,
    {
      configs: [],
      cliArgs: {
        dev: false,
        silent: false,
        watch: false,
        basePath: false,
        oss: false,
        runExamples: false,
        disableOptimizer: true,
        cache: false,
        dist: true,
      },
    },
    {
      ...kibanaPackageJson,
      version: POD_KIBANA_VERSION,
      build: { ...kibanaPackageJson.build, distributable: true },
    }
  );
  const loggerFactory = { get: (...parts: string[]) => logger.get(...parts) as Logger };
  const configService = new ConfigService({ getConfig$: () => of(config) }, env, loggerFactory);
  return {
    coreId: Symbol('task pod core'),
    env,
    configService: configService as never,
    logger: loggerFactory as never,
  };
};
