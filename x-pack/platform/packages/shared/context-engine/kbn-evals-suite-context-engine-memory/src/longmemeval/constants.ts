/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LONGMEMEVAL_SOURCE_REVISION = '98d7416c24c778c2fee6e6f3006e7a073259d48f';
export const LONGMEMEVAL_SOURCE_FILENAME = 'longmemeval_s_cleaned.json';
export const LONGMEMEVAL_SOURCE_URL = `https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned/resolve/${LONGMEMEVAL_SOURCE_REVISION}/${LONGMEMEVAL_SOURCE_FILENAME}`;
export const LONGMEMEVAL_SOURCE_SHA256 =
  'd6f21ea9d60a0d56f34a05b609c79c88a451d2ae03597821ea3d5a9678c3a442';
export const LONGMEMEVAL_SOURCE_BYTES = 277_383_467;
export const LONGMEMEVAL_EXAMPLE_COUNT = 500;

/** OmniMemEval canonical split (search-team#16824); used offline to select the IDs below. */
export const LONGMEMEVAL_SPLIT_REVISION = 'c59646573e3a56fb0c08623c149f390c572ab5bc';
/** Upstream `evaluate_qa.py` revision the judge prompts are copied from. */
export const LONGMEMEVAL_REFERENCE_JUDGE_REVISION = '9e0b455f4ef0e2ab8f2e582289761153549043fc';

/**
 * First structurally valid development example per evaluator branch, in source order,
 * excluding IDs with a holdout twin. Never replace an ID because the agent answers it poorly.
 */
export const SELECTED_EXAMPLE_IDS = [
  '118b2229',
  'gpt4_59149c77',
  '6a1eabeb',
  '8a2466db',
  '0862e8bf_abs',
] as const;
export const SELECTED_EXAMPLE_SPLIT = 'dev';

export const DATASET_NAME = 'context-engine-memory: longmemeval-s-direct-index-v1';
export const POC_INDEX = 'longmemeval-memory-direct-index-poc';

export const SUITE_VERSION = 'longmemeval-direct-index-suite-v1';
export const PROMPT_VERSION = 'longmemeval-direct-index-prompt-v1';
export const INDEX_SCHEMA_VERSION = 'turn-per-document-v1';
export const ARM_ID = 'direct-index-native-tools';

export const EVALUATOR_NAME = 'longmemeval-answer-accuracy';
export const EVALUATOR_VERSION = 'longmemeval-ts-v1';
export const JUDGE_TRANSPORT_VERSION = 'forced-tool-call-v1';

/** Agent Builder's default per-tool-call result budget (`DEFAULT_MAX_TOOL_RESULT_TOKENS`). */
export const AGENT_BUILDER_TOOL_RESULT_TOKEN_BUDGET = 20_000;
