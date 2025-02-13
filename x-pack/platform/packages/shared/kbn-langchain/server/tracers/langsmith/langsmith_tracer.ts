/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from 'langsmith';
import type { Logger } from '@kbn/core/server';
import { ToolingLog } from '@kbn/tooling-log';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';

/**
 * Returns a custom LangChainTracer which adds the `exampleId` so Dataset 'Test' runs are written to LangSmith
 * If `exampleId` is present (and a corresponding example exists in LangSmith) trace is written to the Dataset's `Tests`
 * section, otherwise it is written to the `Project` provided
 *
 * @param apiKey API Key for LangSmith (will fetch from env vars if not provided)
 * @param projectName Name of project to trace results to
 * @param exampleId Dataset exampleId to associate trace with
 * @param logger
 */
export const getLangSmithTracer = ({
  apiKey,
  projectName,
  exampleId,
  logger,
}: {
  apiKey?: string;
  projectName?: string;
  exampleId?: string;
  logger: Logger | ToolingLog;
}): LangChainTracer[] => {
  try {
    if (!apiKey) {
      return [];
    }
    const lcTracer = new LangChainTracer({
      projectName, // Shows as the 'test' run's 'name' in langsmith ui
      exampleId,
      client: new Client({ apiKey }),
    });

    return [lcTracer];
  } catch (e) {
    // Note: creating a tracer can fail if the LangSmith env vars are not set correctly
    logger.error(`Error creating LangSmith tracer: ${e.message}`);
  }

  return [];
};

/**
 * Returns true if LangSmith/tracing is enabled
 */
export const isLangSmithEnabled = (): boolean => {
  try {
    // Just checking if apiKey is available, if better way to check for enabled that is not env var please update
    const config = Client.getDefaultClientConfig();
    return config.apiKey != null;
  } catch (e) {
    return false;
  }
};
