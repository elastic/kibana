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
import type { ToolCallWithResult, Conversation } from '@kbn/agent-builder-common';
import { isToolCallStep, isReasoningStep } from '@kbn/agent-builder-common';
import type { ConversationRound } from '@kbn/agent-builder-common';

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

/** A suggested relationship between memories, extracted by the LLM */
export interface ExtractedRelationship {
  /** Target: either an existing memory ID or a local ref like "semantic_0", "episodic_1" for co-extracted memories */
  target: string;
  /** Relationship type */
  type: string;
  /** Confidence in this relationship */
  weight: number;
}

/** A single extracted memory candidate from LLM extraction */
export interface ExtractedMemoryCandidate {
  summary: string;
  full: string;
  subtype?: string;
  confidence: number;
  /** IDs of existing memories this candidate should link to (suggested by the LLM) */
  suggested_links?: string[];
  /** Structured domain-specific properties (cognitive mode) */
  params?: Record<string, unknown>;
  /** Typed relationships to other memories (existing IDs or local refs) */
  relationships?: ExtractedRelationship[];
}

/** The structured output from a single extraction call */
export interface ExtractionResult {
  semantic: ExtractedMemoryCandidate[];
  episodic: ExtractedMemoryCandidate[];
  procedural: ExtractedMemoryCandidate[];
}

// ---------------------------------------------------------------------------
// Caps
// ---------------------------------------------------------------------------

/** Maximum semantic memories to extract per round */
const MAX_SEMANTIC_PER_ROUND = 5;

/** Maximum episodic memories to extract per round */
const MAX_EPISODIC_PER_ROUND = 5;

/** Maximum procedural memories to extract per round */
const MAX_PROCEDURAL_PER_ROUND = 3;

/** Minimum confidence threshold — candidates below this are discarded */
const MIN_CONFIDENCE_THRESHOLD = 0.4;

/** Maximum characters for individual tool call param/result summaries */
const MAX_TOOL_RESULT_CHARS = 500;

// ---------------------------------------------------------------------------
// Extraction prompt
// ---------------------------------------------------------------------------

const EXTRACTION_SYSTEM_PROMPT = `You are a memory extraction assistant. Your job is to identify and extract durable knowledge from a single conversation round.

You will receive:
- The user's message
- The assistant's reasoning steps (internal thought process)
- Tool calls with their parameters and results
- The assistant's final response

Extract memories in three categories:

**SEMANTIC** — Durable facts about the user, their projects, or preferences. Things that remain true across many conversations.
Examples:
  - "User prefers TypeScript over JavaScript for new projects"
  - "User's main project is a Kibana plugin called agent_builder"
  - "User wants tests to be written before implementation"

**EPISODIC** — Specific events, decisions, or takeaways from THIS round. NOT conversation summaries.
Good: "User proposed using embedding-based deduplication with 0.92 similarity threshold"
Bad: "We discussed memory architecture"

**PROCEDURAL** — Behavior rules or workflow preferences observed in this round.
Examples:
  - "Always run type_check before committing TypeScript changes"
  - "Use BM25 search before embedding-based kNN for memory retrieval"

Rules:
- Only extract information with clear signal. If uncertain, use lower confidence.
- confidence: 0.0–1.0. Below 0.4 = do not extract.
- summary: one concise line, max 100 tokens.
- full: detailed version, max 500 tokens.
- subtype: optional fine-grained label (e.g. 'user_preference', 'project_fact', 'decision', 'workflow_step').
- suggested_links: IDs of existing memories this new memory is related to (only for semantic).
- Episodic memories are EVENTS/TAKEAWAYS, not conversation summaries.

Respond with ONLY valid JSON matching this schema:
{
  "semantic": [{ "summary": string, "full": string, "subtype": string?, "confidence": number, "suggested_links": string[]? }],
  "episodic": [{ "summary": string, "full": string, "subtype": string?, "confidence": number }],
  "procedural": [{ "summary": string, "full": string, "subtype": string?, "confidence": number }]
}

If no memories to extract in a category, use an empty array [].`;

// ---------------------------------------------------------------------------
// Deps
// ---------------------------------------------------------------------------

export interface MemoryExtractorDeps {
  inference: InferenceServerStart;
  connectorId: string;
  request: KibanaRequest;
  logger: Logger;
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface ExtractionInput {
  userMessage: string;
  assistantResponse: string;
  toolCalls?: ToolCallWithResult[];
  reasoningSteps?: string[];
  /** Full conversation for context. Not used by current extractors. */
  conversation?: Conversation;
}

// ---------------------------------------------------------------------------
// Extractor
// ---------------------------------------------------------------------------

/**
 * Extracts candidate memories from a completed conversation round using an LLM.
 *
 * Uses the Kibana inference plugin to call the configured connector.
 * Output is structured and validated; low-confidence candidates are filtered.
 * Results are capped per type: 5 semantic + 5 episodic + 3 procedural.
 */
export class MemoryExtractor {
  private readonly inference: InferenceServerStart;
  private readonly connectorId: string;
  private readonly request: KibanaRequest;
  private readonly logger: Logger;

  constructor({ inference, connectorId, request, logger }: MemoryExtractorDeps) {
    this.inference = inference;
    this.connectorId = connectorId;
    this.request = request;
    this.logger = logger;
  }

  /**
   * Extract memory candidates from a completed round.
   *
   * @param input - Round content to extract from
   * @returns Filtered and capped ExtractionResult, never throws
   */
  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const userContent = this.buildUserContent(input);

    try {
      const inferenceClient = this.inference.getClient({
        request: this.request,
        bindTo: { connectorId: this.connectorId },
      }) as BoundInferenceClient;

      const response = await inferenceClient.chatComplete({
        messages: [
          {
            role: MessageRole.User,
            content: userContent,
          },
        ],
        system: EXTRACTION_SYSTEM_PROMPT,
      });

      const raw = response.content;
      if (!raw) {
        this.logger.debug('MemoryExtractor: empty response from LLM');
        return emptyResult();
      }

      return this.parseAndFilter(raw);
    } catch (err) {
      this.logger.warn(`MemoryExtractor: extraction failed — ${(err as Error).message}`);
      return emptyResult();
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildUserContent(input: ExtractionInput): string {
    const parts: string[] = [];

    parts.push(`**User message:**\n${input.userMessage}`);

    if (input.reasoningSteps && input.reasoningSteps.length > 0) {
      parts.push(`**Agent reasoning steps:**\n${input.reasoningSteps.join('\n')}`);
    }

    if (input.toolCalls && input.toolCalls.length > 0) {
      const summaries = input.toolCalls
        .map((tc) => this.summarizeToolCall(tc))
        .filter((s) => s.length > 0);

      if (summaries.length > 0) {
        parts.push(`**Tool calls and results:**\n${summaries.join('\n')}`);
      }
    }

    parts.push(`**Assistant response:**\n${input.assistantResponse}`);

    return parts.join('\n\n');
  }

  private summarizeToolCall(tc: ToolCallWithResult): string {
    const paramsText = Object.keys(tc.params).length > 0
      ? ` params=${JSON.stringify(tc.params).slice(0, MAX_TOOL_RESULT_CHARS)}`
      : '';

    const resultText = tc.results
      .map((r) => {
        const text = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
        return text.slice(0, MAX_TOOL_RESULT_CHARS * 2);
      })
      .join(' | ');

    return `[${tc.tool_id}]${paramsText} → ${resultText || '(no result)'}`;
  }

  private parseAndFilter(raw: string): ExtractionResult {
    let parsed: unknown;

    try {
      const cleaned = this.extractJson(raw);
      parsed = JSON.parse(cleaned);
    } catch (err) {
      this.logger.warn(`MemoryExtractor: failed to parse JSON response — ${(err as Error).message}`);
      return emptyResult();
    }

    if (!parsed || typeof parsed !== 'object') {
      return emptyResult();
    }

    const obj = parsed as Record<string, unknown>;

    const semantic = this.extractAndFilter(
      obj.semantic,
      MAX_SEMANTIC_PER_ROUND,
      'semantic',
      true // has suggested_links
    );
    const episodic = this.extractAndFilter(obj.episodic, MAX_EPISODIC_PER_ROUND, 'episodic', false);
    const procedural = this.extractAndFilter(
      obj.procedural,
      MAX_PROCEDURAL_PER_ROUND,
      'procedural',
      false
    );

    this.logger.debug(
      `MemoryExtractor: extracted semantic=${semantic.length}, episodic=${episodic.length}, procedural=${procedural.length}`
    );

    return { semantic, episodic, procedural };
  }

  private extractAndFilter(
    raw: unknown,
    cap: number,
    type: string,
    hasSuggestedLinks: boolean
  ): ExtractedMemoryCandidate[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    const result: ExtractedMemoryCandidate[] = [];

    for (const item of raw) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      const { summary, full, subtype, confidence, suggested_links: suggestedLinks } = item as Record<
        string,
        unknown
      >;

      if (typeof summary !== 'string' || !summary.trim()) {
        continue;
      }
      if (typeof full !== 'string' || !full.trim()) {
        continue;
      }
      if (typeof confidence !== 'number' || isNaN(confidence)) {
        continue;
      }

      // Filter below minimum threshold
      if (confidence < MIN_CONFIDENCE_THRESHOLD) {
        this.logger.debug(
          `MemoryExtractor: skipping low-confidence ${type} candidate (confidence=${confidence.toFixed(2)}): "${summary.slice(0, 60)}"`
        );
        continue;
      }

      const candidate: ExtractedMemoryCandidate = {
        summary: String(summary).trim(),
        full: String(full).trim(),
        confidence: Math.min(1.0, Math.max(0.0, confidence)),
      };

      if (typeof subtype === 'string' && subtype.trim()) {
        candidate.subtype = subtype.trim();
      }

      if (hasSuggestedLinks && Array.isArray(suggestedLinks)) {
        candidate.suggested_links = (suggestedLinks as unknown[])
          .filter((l): l is string => typeof l === 'string')
          .slice(0, 10);
      }

      result.push(candidate);

      if (result.length >= cap) {
        break;
      }
    }

    return result;
  }

  private extractJson(text: string): string {
    // Try markdown fenced block first
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      return fenced[1].trim();
    }
    // Try to find the outermost JSON object
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      return text.slice(jsonStart, jsonEnd + 1).trim();
    }
    return text.trim();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const emptyResult = (): ExtractionResult => ({
  semantic: [],
  episodic: [],
  procedural: [],
});

/**
 * Build an ExtractionInput from a ConversationRound.
 * Extracts user message, assistant response, reasoning steps, and all tool calls.
 * Optionally includes previous rounds for context.
 */
export const buildExtractionInputFromRound = (
  round: ConversationRound,
  conversation?: Conversation
): ExtractionInput => {
  const userMessage = round.input.message ?? '';
  const assistantResponse = round.response.message ?? '';

  const toolCalls: ToolCallWithResult[] = round.steps
    .filter(isToolCallStep)
    .map((step) => step as unknown as ToolCallWithResult);

  const reasoningSteps: string[] = round.steps
    .filter(isReasoningStep)
    .filter((step) => !step.transient && step.reasoning?.trim())
    .map((step) => step.reasoning.trim());

  return {
    userMessage,
    assistantResponse,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    reasoningSteps: reasoningSteps.length > 0 ? reasoningSteps : undefined,
    conversation,
  };
};
