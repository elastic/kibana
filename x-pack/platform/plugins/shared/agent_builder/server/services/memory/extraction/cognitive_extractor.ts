/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { ExtractionInput, ExtractionResult, ExtractedMemoryCandidate, ExtractedRelationship } from './memory_extractor';

const MIN_CONFIDENCE = 0.4;
const MAX_SEMANTIC = 8;
const MAX_EPISODIC = 5;
const MAX_PROCEDURAL = 3;

/**
 * Brain-inspired cognitive extraction prompt.
 *
 * Unlike the standard prompt which extracts flat text memories, this prompt asks
 * the LLM to produce structured objects with domain-specific properties for each
 * memory type. Inspired by Synthius-Mem's six cognitive domains.
 */
const COGNITIVE_SYSTEM_PROMPT = `You are a cognitive memory extraction assistant. Your job is to extract structured knowledge from a conversation round, organized into brain-inspired cognitive domains.

You will receive the user's message, agent reasoning, tool calls/results, and the final response.

Extract memories in three types, each with STRUCTURED PROPERTIES:

## SEMANTIC — Durable facts about the user, their world, and preferences.
Subcategories (use as "subtype"):
- **biography**: Personal facts (name, age, location, education, family, health, etc.)
- **work**: Professional info (role, company, projects, skills, tools, technologies)
- **preference**: Evaluative judgments (likes/dislikes, style preferences, tool preferences)
- **social**: People the user knows (relationships, roles, how they relate)
- **psychometric**: Personality traits, communication style, values, behavioral patterns

Each semantic memory MUST include a "params" object with domain-specific fields:
- biography: { "category": string, ...relevant fields }
- work: { "role"?: string, "company"?: string, "project"?: string, "skills"?: string[], "tools"?: string[] }
- preference: { "topic": string, "polarity": "positive"|"negative"|"neutral", "strength": 0.0-1.0 }
- social: { "person": string, "relationship"?: string, "closeness"?: 0.0-1.0 }
- psychometric: { "trait": string, "framework"?: string, "score"?: 0.0-1.0, "evidence"?: string }

## EPISODIC — Specific events, decisions, or experiences from THIS round.
NOT conversation summaries. Each must include "params":
- { "emotion"?: string, "intensity"?: 0.0-1.0, "people_involved"?: string[], "temporal_context"?: string, "outcome"?: string }

## PROCEDURAL — Behavior rules, workflow preferences, or action patterns.
Each must include "params":
- { "trigger": string, "action": string, "context"?: string, "frequency"?: "always"|"usually"|"sometimes"|"once" }

## RELATIONSHIPS — Connections between extracted memories.
After extracting memories, identify relationships between them using local references.
Each memory gets a local ref: "semantic_0", "semantic_1", "episodic_0", "procedural_0", etc.
You may also reference existing memory IDs if provided.

Relationship types: related_to, applies_to, derived_from, contradicts, same_project, preference_cluster, refines.

Rules:
- confidence: 0.0–1.0. Below 0.4 = do not extract.
- summary: one concise line, max 100 tokens.
- full: detailed version, max 500 tokens.
- subtype: required for semantic (biography/work/preference/social/psychometric), optional for others.
- params: REQUIRED for all memories in cognitive mode.
- relationships: optional array of { "target": "local_ref_or_id", "type": "relationship_type", "weight": 0.0-1.0 }
- Do NOT extract conversation summaries as episodic. Extract specific events/decisions.

Respond with ONLY valid JSON:
{
  "semantic": [{ "summary": string, "full": string, "subtype": string, "confidence": number, "params": {...}, "relationships"?: [...] }],
  "episodic": [{ "summary": string, "full": string, "subtype"?: string, "confidence": number, "params": {...}, "relationships"?: [...] }],
  "procedural": [{ "summary": string, "full": string, "subtype"?: string, "confidence": number, "params": {...}, "relationships"?: [...] }]
}

If no memories in a category, use [].`;

export interface CognitiveExtractorDeps {
  inference: InferenceServerStart;
  connectorId: string;
  request: KibanaRequest;
  logger: Logger;
  /** If provided, called with the full LLM request and raw response for debugging. */
  onRawExchange?: (exchange: { system: string; userContent: string; rawResponse: string }) => void;
}

/**
 * Cognitive memory extractor that produces structured memories with domain-specific params.
 * Uses the same LLM pipeline as the standard extractor but with a different prompt
 * that asks for structured properties per memory type.
 */
export class CognitiveExtractor {
  private readonly inference: InferenceServerStart;
  private readonly connectorId: string;
  private readonly request: KibanaRequest;
  private readonly logger: Logger;
  private readonly onRawExchange?: CognitiveExtractorDeps['onRawExchange'];

  constructor({ inference, connectorId, request, logger, onRawExchange }: CognitiveExtractorDeps) {
    this.inference = inference;
    this.connectorId = connectorId;
    this.request = request;
    this.logger = logger;
    this.onRawExchange = onRawExchange;
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const userContent = this.buildUserContent(input);

    try {
      const inferenceClient = this.inference.getClient({
        request: this.request,
        bindTo: { connectorId: this.connectorId },
      }) as BoundInferenceClient;

      const response = await inferenceClient.chatComplete({
        messages: [{ role: MessageRole.User, content: userContent }],
        system: COGNITIVE_SYSTEM_PROMPT,
      });

      const raw = response.content ?? '';

      if (this.onRawExchange) {
        this.onRawExchange({ system: COGNITIVE_SYSTEM_PROMPT, userContent, rawResponse: raw });
      }

      if (!raw) {
        this.logger.debug('CognitiveExtractor: empty response from LLM');
        return { semantic: [], episodic: [], procedural: [] };
      }

      return this.parseAndFilter(raw);
    } catch (err) {
      this.logger.warn(`CognitiveExtractor: extraction failed — ${(err as Error).message}`);
      return { semantic: [], episodic: [], procedural: [] };
    }
  }

  private buildUserContent(input: ExtractionInput): string {
    return input.message;
  }

  private parseAndFilter(raw: string): ExtractionResult {
    let parsed: unknown;
    try {
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      const cleaned = jsonMatch ? jsonMatch[1].trim() : raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
      parsed = JSON.parse(cleaned);
    } catch (err) {
      this.logger.warn(`CognitiveExtractor: failed to parse JSON — ${(err as Error).message}`);
      return { semantic: [], episodic: [], procedural: [] };
    }

    if (!parsed || typeof parsed !== 'object') {
      return { semantic: [], episodic: [], procedural: [] };
    }

    const obj = parsed as Record<string, unknown>;

    const semantic = this.filterCandidates(obj.semantic, MAX_SEMANTIC);
    const episodic = this.filterCandidates(obj.episodic, MAX_EPISODIC);
    const procedural = this.filterCandidates(obj.procedural, MAX_PROCEDURAL);

    this.logger.debug(
      `CognitiveExtractor: extracted semantic=${semantic.length}, episodic=${episodic.length}, procedural=${procedural.length}`
    );

    return { semantic, episodic, procedural };
  }

  private filterCandidates(raw: unknown, cap: number): ExtractedMemoryCandidate[] {
    if (!Array.isArray(raw)) return [];

    const result: ExtractedMemoryCandidate[] = [];

    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;

      const { summary, full, subtype, confidence, params, suggested_links: suggestedLinks } =
        item as Record<string, unknown>;

      if (typeof summary !== 'string' || !summary.trim()) continue;
      if (typeof full !== 'string' || !full.trim()) continue;
      if (typeof confidence !== 'number' || isNaN(confidence)) continue;
      if (confidence < MIN_CONFIDENCE) continue;

      const candidate: ExtractedMemoryCandidate = {
        summary: String(summary).trim(),
        full: String(full).trim(),
        confidence: Math.min(1, Math.max(0, confidence)),
      };

      if (typeof subtype === 'string' && subtype.trim()) {
        candidate.subtype = subtype.trim();
      }

      if (params && typeof params === 'object') {
        candidate.params = params as Record<string, unknown>;
      }

      // Parse typed relationships
      const relationships = (item as Record<string, unknown>).relationships;
      if (Array.isArray(relationships)) {
        candidate.relationships = relationships
          .filter((r: any) => r && typeof r.target === 'string' && typeof r.type === 'string')
          .map((r: any): ExtractedRelationship => ({
            target: r.target,
            type: r.type,
            weight: typeof r.weight === 'number' ? Math.min(1, Math.max(0, r.weight)) : 0.5,
          }))
          .slice(0, 10);
      }

      if (Array.isArray(suggestedLinks)) {
        candidate.suggested_links = (suggestedLinks as unknown[])
          .filter((l): l is string => typeof l === 'string')
          .slice(0, 10);
      }

      result.push(candidate);
      if (result.length >= cap) break;
    }

    return result;
  }
}
