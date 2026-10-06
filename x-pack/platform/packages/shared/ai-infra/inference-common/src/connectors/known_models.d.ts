/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelFamily, ModelProvider } from '../model_provider';
export interface ModelDefinition {
  /** Canonical id, used to match the model against a full model name string. */
  id: string;
  /**
   * Additional id spellings this definition should match. Useful when a provider ships the same
   * model under multiple naming conventions — e.g. Claude 4+ is `claude-sonnet-4-5` on Bedrock /
   * Anthropic direct / Vertex but `claude-4.5-sonnet` on Elastic Inference Service.
   */
  aliases?: string[];
  provider: ModelProvider;
  family: ModelFamily;
  contextWindow: number;
}
/**
 * Retrieve a model definition from the given full model name, if available.
 *
 * The match is a substring test against the canonical id (and each alias), and against the
 * dot-to-dash form of each — this covers the common id shapes across providers:
 * - EIS (`anthropic-claude-4.6-sonnet`, `openai-gpt-5.6-terra`, …) uses version-first with dots.
 * - Anthropic direct / Bedrock / Vertex use family-first with dashes since Claude 4
 *   (`claude-sonnet-4-6`, `claude-opus-4-1-20250805`, …).
 * - Older Claude generations (3.x) use version-first with dashes and a date suffix
 *   (`claude-3-5-sonnet-20241022`), which the dash-replaced form of `claude-3.5-sonnet` catches.
 *
 * Because the id order matters (first match wins), more specific canonical ids must appear before
 * shorter substrings — e.g. `claude-opus-4-1` before `claude-opus-4`, `gpt-5-mini` before `gpt-5`.
 */
export declare const getModelDefinition: (fullModelName: string) => ModelDefinition | undefined;
/**
 * Manually maintained model definitions used as fallback for feature detection.
 *
 * When a provider ships the same model under multiple naming conventions (typically EIS
 * version-first vs native/Bedrock family-first for Claude 4+), pick one canonical id and put
 * the other one in `aliases` rather than adding a second entry.
 */
export declare const knownModels: ModelDefinition[];
