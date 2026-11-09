/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';

/**
 * Typed search space for the `generate_esql` harness.
 *
 * Every field defaults to today's hand-tuned behaviour, so a run with no override file is
 * byte-identical to current `main`. Overrides are read from the file pointed at by
 * `ESQL_HARNESS_CONFIG` and are only intended for the offline optimization loop in
 * `@kbn/esql-harness-opt`; production never sets that variable.
 */
export interface EsqlHarnessConfig {
  /** Slot A — which documentation is retrieved and when. */
  docRetrieval: {
    /** Pre-fetch doc keywords from the NL query alone while the index is being discovered. */
    prefetchWithoutResource: boolean;
    /** Keywords always added to the model's documentation request. */
    alwaysInclude: string[];
  };
  /** Slot B — exemplar selection out of `documentation/examples.md`. */
  exemplars: {
    /** `all` injects the whole examples corpus (today's behaviour); `knn` retrieves per query. */
    selection: 'all' | 'knn';
    /** Number of exemplars injected when `selection` is `knn`. */
    k: number;
  };
  /** Slot C — how much of the resolved resource is shown to the model. */
  resourceContext: {
    samplingSize: number;
  };
  /** Slot D — what the model sees after a failed attempt. */
  feedback: {
    /** Max characters of an Elasticsearch error replayed into the next turn (0 = unlimited). */
    errorTruncation: number;
    /** Restate the query that failed next to its error. */
    includeFailedQuery: boolean;
    /** Template for execution errors. Placeholders: `{{error}}`, `{{query}}`. */
    executionErrorTemplate: string;
    /** Template for AST validation errors. Placeholders: `{{error}}`, `{{query}}`. */
    validationErrorTemplate: string;
    /** Template used when the model answered without a query. */
    noQueryTemplate: string;
  };
  /** Slot E — retry economics. `null` means "whatever the caller passed". */
  retryPolicy: {
    maxRetries: number | null;
    execute: 'none' | 'schema' | 'data' | null;
    executionTimeoutMs: number | null;
    /** Keep the join-reject short circuit (today: true). */
    stopOnJoinReject: boolean;
    /** How many timed-out executions are tolerated before the call ends (today: 1 retry). */
    timeoutRetryBudget: number;
  };
  /**
   * Slot F — which model tier runs each step. Today both steps run on the `low` tier; keyword
   * selection and query generation are different tasks, so the loop can price them separately.
   */
  model: {
    generateEffort: 'low' | 'medium' | 'high';
    requestDocEffort: 'low' | 'medium' | 'high';
  };
  /** Slot G — prompt prose. Appended to the instruction block; opened last on purpose. */
  instructions: {
    extraInstructions: string;
  };
}

export const DEFAULT_ESQL_HARNESS_CONFIG: EsqlHarnessConfig = {
  docRetrieval: {
    prefetchWithoutResource: true,
    alwaysInclude: [],
  },
  exemplars: {
    selection: 'all',
    k: 8,
  },
  resourceContext: {
    samplingSize: 100,
  },
  feedback: {
    errorTruncation: 0,
    includeFailedQuery: false,
    executionErrorTemplate: `I tried executing the query and got the following error:

\`\`\`
{{error}}
\`\`\`

Can you fix the query?`,
    validationErrorTemplate: `I tried validating the query and got the following error:

\`\`\`
{{error}}
\`\`\`

Can you fix the query?`,
    noQueryTemplate: `I don't see any query in your response, can you please try again? Don't forget to wrap your query with \`\`\`esql[query]\`\`\``,
  },
  retryPolicy: {
    maxRetries: null,
    execute: null,
    executionTimeoutMs: null,
    stopOnJoinReject: true,
    timeoutRetryBudget: 1,
  },
  model: {
    generateEffort: 'low',
    requestDocEffort: 'low',
  },
  instructions: {
    extraInstructions: '',
  },
};

const ENV_VAR = 'ESQL_HARNESS_CONFIG';

let cache: { path: string; mtimeMs: number; config: EsqlHarnessConfig } | undefined;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const mergeConfig = (
  defaults: Record<string, unknown>,
  overrides: Record<string, unknown>
): Record<string, unknown> => {
  const result: Record<string, unknown> = { ...defaults };
  for (const [key, value] of Object.entries(overrides)) {
    const current = result[key];
    result[key] =
      isPlainObject(current) && isPlainObject(value) ? mergeConfig(current, value) : value;
  }
  return result;
};

/**
 * Current harness configuration: the defaults unless `ESQL_HARNESS_CONFIG` points at a JSON file,
 * in which case that file is deep-merged over them. The file is re-read whenever its mtime
 * changes so an optimization round can swap configs without restarting Kibana.
 */
export const getEsqlHarnessConfig = (): EsqlHarnessConfig => {
  const path = process.env[ENV_VAR];
  if (!path) {
    return DEFAULT_ESQL_HARNESS_CONFIG;
  }

  try {
    const { mtimeMs } = Fs.statSync(path);
    if (cache && cache.path === path && cache.mtimeMs === mtimeMs) {
      return cache.config;
    }
    const overrides = JSON.parse(Fs.readFileSync(path, 'utf8')) as Record<string, unknown>;
    const config = mergeConfig(
      DEFAULT_ESQL_HARNESS_CONFIG as unknown as Record<string, unknown>,
      overrides
    ) as unknown as EsqlHarnessConfig;
    cache = { path, mtimeMs, config };
    return config;
  } catch (e) {
    // An unreadable override file must never take production-shaped code paths down.
    return DEFAULT_ESQL_HARNESS_CONFIG;
  }
};

/** Apply the configured error truncation, keeping the head and tail of long Elasticsearch errors. */
export const truncateHarnessError = (error: string | undefined, limit: number): string => {
  const text = error ?? '';
  if (limit <= 0 || text.length <= limit) {
    return text;
  }
  const head = Math.ceil(limit * 0.7);
  const tail = limit - head;
  return `${text.slice(0, head)}\n…[truncated]…\n${text.slice(text.length - tail)}`;
};

/** Fill `{{error}}` / `{{query}}` placeholders in a feedback template. */
export const renderFeedbackTemplate = (
  template: string,
  { error, query }: { error: string; query: string }
): string => template.replace(/\{\{error\}\}/g, error).replace(/\{\{query\}\}/g, query);
