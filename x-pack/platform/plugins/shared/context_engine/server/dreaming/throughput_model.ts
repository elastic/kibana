/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The most branches one `parallel` step runs (`DEFAULT_PARALLEL_MAX_FAN_OUT` of the workflow engine). */
export const PARALLEL_MAX_FAN_OUT = 100;
/** The most branches a `parallel` step runs at once (`DEFAULT_PARALLEL_MAX_CONCURRENCY`). */
export const PARALLEL_MAX_CONCURRENCY = 20;
/**
 * Estimated tokens one trace dreaming read can carry in a step output: the 10mb step limit, with
 * every round returned twice (`memories` and `batches`) at about 4 chars per token.
 */
export const STEP_SIZE_TOKEN_CEILING = 1_200_000;

export interface TraceDreamingThroughputInput {
  /** Branches of the `parallel` step running at once. */
  concurrency: number;
  /** Workflow timeout, in minutes. */
  timeoutMinutes: number;
  /** Seconds one batch takes, model call and writes included. */
  callLatencySeconds: number;
  /** Estimated tokens of one batch (`batch_tokens`). */
  batchTokens: number;
  /** Estimated tokens one read takes (`max_tokens`). */
  maxTokens: number;
  /** Input tokens per minute the connector accepts. Omit when unknown. */
  connectorTokensPerMinute?: number;
  /** Share of the timeout a run plans to use, leaving room for the read and the writes. Defaults to 0.8. */
  timeoutSafetyFactor?: number;
}

export interface TraceDreamingThroughput {
  /** Batches a read produces: `max_tokens / batch_tokens`, at most the `parallel` fan-out. */
  batches: number;
  /** Rounds of batches the run needs: `batches / concurrency`. */
  waves: number;
  /** Seconds the batches take: `waves x latency`. */
  estimatedSeconds: number;
  /** Whether the batches finish within the usable part of the timeout. */
  fitsTimeout: boolean;
  /** Whether the read fits in a step output. */
  fitsStepSize: boolean;
  /** Input tokens per minute the batches send while they run. */
  tokensPerMinute: number;
  /** Whether that stays within the connector rate, true when the rate is unknown. */
  withinConnectorRate: boolean;
  /** Estimated tokens one run processes: all of them when the run completes, none when it times out. */
  tokensPerRun: number;
  /** The largest `max_tokens` that fits the timeout, step size, fan-out and connector rate. */
  recommendedMaxTokens: number;
}

const DEFAULT_TIMEOUT_SAFETY_FACTOR = 0.8;

/**
 * Models what one trace dreaming run can process. A run is all or nothing: the cursor only moves
 * when the run succeeds, so a run that times out re-reads its window.
 */
export const modelTraceDreamingThroughput = ({
  concurrency,
  timeoutMinutes,
  callLatencySeconds,
  batchTokens,
  maxTokens,
  connectorTokensPerMinute,
  timeoutSafetyFactor = DEFAULT_TIMEOUT_SAFETY_FACTOR,
}: TraceDreamingThroughputInput): TraceDreamingThroughput => {
  const effectiveConcurrency = Math.min(Math.max(1, concurrency), PARALLEL_MAX_CONCURRENCY);
  const usableSeconds = timeoutMinutes * 60 * timeoutSafetyFactor;

  const batches = Math.min(Math.ceil(maxTokens / batchTokens), PARALLEL_MAX_FAN_OUT);
  const waves = Math.ceil(batches / effectiveConcurrency);
  const estimatedSeconds = waves * callLatencySeconds;
  const tokensPerMinute = (effectiveConcurrency * batchTokens * 60) / callLatencySeconds;
  const withinConnectorRate =
    connectorTokensPerMinute === undefined || tokensPerMinute <= connectorTokensPerMinute;
  const fitsTimeout = estimatedSeconds <= usableSeconds;
  const planned = Math.min(maxTokens, batches * batchTokens);
  const fitsStepSize = planned <= STEP_SIZE_TOKEN_CEILING;

  const sustainedTokensPerMinute = Math.min(
    tokensPerMinute,
    connectorTokensPerMinute ?? Number.POSITIVE_INFINITY
  );
  const batchesByTime = effectiveConcurrency * Math.floor(usableSeconds / callLatencySeconds);
  const batchesByRate = Math.floor((sustainedTokensPerMinute * (usableSeconds / 60)) / batchTokens);
  const recommendedBatches = Math.max(
    0,
    Math.min(
      batchesByTime,
      batchesByRate,
      PARALLEL_MAX_FAN_OUT,
      Math.floor(STEP_SIZE_TOKEN_CEILING / batchTokens)
    )
  );

  return {
    batches,
    waves,
    estimatedSeconds,
    fitsTimeout,
    fitsStepSize,
    tokensPerMinute,
    withinConnectorRate,
    tokensPerRun: fitsTimeout ? planned : 0,
    recommendedMaxTokens: recommendedBatches * batchTokens,
  };
};
