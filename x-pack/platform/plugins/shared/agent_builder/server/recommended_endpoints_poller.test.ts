/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { deriveRecommendations } from './recommended_endpoints_poller';

const SONNET = '.anthropic-claude-4.6-sonnet-chat_completion';
const OPUS = '.anthropic-claude-4.6-opus-chat_completion';
const HAIKU = '.anthropic-claude-4.5-haiku-chat_completion';
const GEMINI_FLASH = '.google-gemini-3.0-flash-chat_completion';

const makeEndpoint = (
  inferenceId: string,
  overrides: {
    capability?: string;
    family?: string;
    releaseDate?: string;
    endOfLifeDate?: string;
    properties?: string[];
    taskType?: string;
    noMetadata?: boolean;
  } = {}
): InferenceInferenceEndpointInfo => {
  const base = {
    inference_id: inferenceId,
    task_type: overrides.taskType ?? 'chat_completion',
    service: 'elastic',
    service_settings: {},
  };

  if (overrides.noMetadata) {
    return base as unknown as InferenceInferenceEndpointInfo;
  }

  return {
    ...base,
    metadata: {
      heuristics: {
        properties: overrides.properties ?? ['kibana-connector'],
        ...(overrides.releaseDate ? { release_date: overrides.releaseDate } : {}),
        ...(overrides.endOfLifeDate ? { end_of_life_date: overrides.endOfLifeDate } : {}),
      },
      ...(overrides.capability ? { capability: overrides.capability } : {}),
      ...(overrides.family ? { family: overrides.family } : {}),
    },
  } as unknown as InferenceInferenceEndpointInfo;
};

describe('deriveRecommendations', () => {
  describe('null gates — EIS fields not yet available', () => {
    it('returns null when no eligible endpoint has a capability field', () => {
      expect(deriveRecommendations([makeEndpoint(SONNET, { family: 'claude-sonnet' })])).toBeNull();
    });

    it('returns null when no eligible endpoint has a family field', () => {
      expect(deriveRecommendations([makeEndpoint(SONNET, { capability: 'capable' })])).toBeNull();
    });

    it('returns null when capability/family endpoints are ineligible (wrong task type)', () => {
      expect(
        deriveRecommendations([
          makeEndpoint(SONNET, { capability: 'capable', family: 'claude', taskType: 'rerank' }),
        ])
      ).toBeNull();
    });

    it('returns null when both lists are empty after AB gate', () => {
      expect(
        deriveRecommendations([
          makeEndpoint('.unvalidated-main', {
            capability: 'capable',
            family: 'x',
            releaseDate: '2025-01-01',
          }),
          makeEndpoint('.unvalidated-fast', {
            capability: 'efficient',
            family: 'y',
            releaseDate: '2025-01-01',
          }),
        ])
      ).toBeNull();
    });
  });

  describe('partial results — independent list application', () => {
    it('returns only recommended when no fast-tier model is validated', () => {
      const result = deriveRecommendations([
        makeEndpoint(SONNET, {
          capability: 'capable',
          family: 'claude-sonnet',
          releaseDate: '2025-01-01',
        }),
        makeEndpoint('.unvalidated-fast', {
          capability: 'efficient',
          family: 'z',
          releaseDate: '2025-01-01',
        }),
      ]);
      expect(result?.recommended).toContain(SONNET);
      expect(result?.fast).toBeUndefined();
    });

    it('returns only fast when no main-tier model is validated', () => {
      const result = deriveRecommendations([
        makeEndpoint('.unvalidated-main', {
          capability: 'capable',
          family: 'x',
          releaseDate: '2025-01-01',
        }),
        makeEndpoint(HAIKU, {
          capability: 'efficient',
          family: 'claude-haiku',
          releaseDate: '2025-01-01',
        }),
      ]);
      expect(result?.fast).toContain(HAIKU);
      expect(result?.recommended).toBeUndefined();
    });
  });

  describe('eligibility filters', () => {
    it('excludes endpoints with no metadata', () => {
      const result = deriveRecommendations([
        makeEndpoint(SONNET, { noMetadata: true }),
        makeEndpoint(HAIKU, {
          capability: 'efficient',
          family: 'claude-haiku',
          releaseDate: '2025-01-01',
        }),
      ]);
      // SONNET has no metadata so it cannot contribute a capability → no main list → null or fast-only
      expect(result?.recommended).toBeUndefined();
    });

    it('excludes endpoints without kibana-connector property', () => {
      const result = deriveRecommendations([
        makeEndpoint(SONNET, {
          capability: 'capable',
          family: 'claude',
          properties: [],
          releaseDate: '2025-01-01',
        }),
        makeEndpoint(HAIKU, {
          capability: 'efficient',
          family: 'claude-haiku',
          releaseDate: '2025-01-01',
        }),
      ]);
      expect(result?.recommended).toBeUndefined();
    });

    it('excludes endpoints with end_of_life_date set', () => {
      const result = deriveRecommendations([
        makeEndpoint(SONNET, {
          capability: 'capable',
          family: 'claude-sonnet',
          releaseDate: '2025-01-01',
          endOfLifeDate: '2026-01-01',
        }),
        makeEndpoint(HAIKU, {
          capability: 'efficient',
          family: 'claude-haiku',
          releaseDate: '2025-01-01',
        }),
      ]);
      expect(result?.recommended).toBeUndefined();
      expect(result?.fast).toContain(HAIKU);
    });

    it('excludes endpoints with non-chat_completion task type', () => {
      const result = deriveRecommendations([
        makeEndpoint(SONNET, {
          capability: 'capable',
          family: 'claude',
          taskType: 'sparse_embedding',
        }),
        makeEndpoint(HAIKU, {
          capability: 'efficient',
          family: 'claude-haiku',
          releaseDate: '2025-01-01',
        }),
      ]);
      expect(result?.recommended).toBeUndefined();
    });
  });

  describe('capability tier routing', () => {
    it('routes capable to recommended, not fast', () => {
      const result = deriveRecommendations([
        makeEndpoint(SONNET, {
          capability: 'capable',
          family: 'claude-sonnet',
          releaseDate: '2025-01-01',
        }),
        makeEndpoint(HAIKU, {
          capability: 'efficient',
          family: 'claude-haiku',
          releaseDate: '2025-01-01',
        }),
      ]);
      expect(result?.recommended).toContain(SONNET);
      expect(result?.fast).not.toContain(SONNET);
    });

    it('routes balanced to recommended', () => {
      const result = deriveRecommendations([
        makeEndpoint(SONNET, {
          capability: 'balanced',
          family: 'claude-sonnet',
          releaseDate: '2025-01-01',
        }),
        makeEndpoint(HAIKU, {
          capability: 'efficient',
          family: 'claude-haiku',
          releaseDate: '2025-01-01',
        }),
      ]);
      expect(result?.recommended).toContain(SONNET);
    });

    it('routes efficient to fast, not recommended', () => {
      const result = deriveRecommendations([
        makeEndpoint(SONNET, {
          capability: 'capable',
          family: 'claude-sonnet',
          releaseDate: '2025-01-01',
        }),
        makeEndpoint(HAIKU, {
          capability: 'efficient',
          family: 'claude-haiku',
          releaseDate: '2025-01-01',
        }),
      ]);
      expect(result?.fast).toContain(HAIKU);
      expect(result?.recommended).not.toContain(HAIKU);
    });
  });

  describe('newest-per-family selection', () => {
    it('picks the model with the more recent release_date within a family', () => {
      const result = deriveRecommendations([
        makeEndpoint(SONNET, {
          capability: 'capable',
          family: 'claude-sonnet',
          releaseDate: '2025-01-01',
        }),
        makeEndpoint(OPUS, {
          capability: 'capable',
          family: 'claude-sonnet',
          releaseDate: '2025-06-01',
        }),
        makeEndpoint(HAIKU, {
          capability: 'efficient',
          family: 'claude-haiku',
          releaseDate: '2025-01-01',
        }),
      ]);
      expect(result?.recommended).toContain(OPUS);
      expect(result?.recommended).not.toContain(SONNET);
    });

    it('prefers any release_date over no release_date', () => {
      const result = deriveRecommendations([
        makeEndpoint(SONNET, { capability: 'capable', family: 'claude-sonnet' }), // no date
        makeEndpoint(OPUS, {
          capability: 'capable',
          family: 'claude-sonnet',
          releaseDate: '2025-01-01',
        }),
        makeEndpoint(HAIKU, {
          capability: 'efficient',
          family: 'claude-haiku',
          releaseDate: '2025-01-01',
        }),
      ]);
      expect(result?.recommended).toContain(OPUS);
      expect(result?.recommended).not.toContain(SONNET);
    });

    it('picks one winner per family across multiple families', () => {
      const result = deriveRecommendations([
        makeEndpoint(SONNET, {
          capability: 'capable',
          family: 'claude-sonnet',
          releaseDate: '2025-01-01',
        }),
        makeEndpoint(OPUS, {
          capability: 'capable',
          family: 'claude-opus',
          releaseDate: '2025-01-01',
        }),
        makeEndpoint(HAIKU, {
          capability: 'efficient',
          family: 'claude-haiku',
          releaseDate: '2025-01-01',
        }),
        makeEndpoint(GEMINI_FLASH, {
          capability: 'efficient',
          family: 'gemini-flash',
          releaseDate: '2025-01-01',
        }),
      ]);
      expect(result?.recommended).toHaveLength(2);
      expect(result?.fast).toHaveLength(2);
    });
  });

  describe('AB validation gate', () => {
    it('excludes unvalidated models', () => {
      const result = deriveRecommendations([
        makeEndpoint('.unvalidated-model', {
          capability: 'capable',
          family: 'claude-sonnet',
          releaseDate: '2025-01-01',
        }),
        makeEndpoint(SONNET, {
          capability: 'capable',
          family: 'claude-sonnet',
          releaseDate: '2024-01-01',
        }),
        makeEndpoint(HAIKU, {
          capability: 'efficient',
          family: 'claude-haiku',
          releaseDate: '2025-01-01',
        }),
      ]);
      expect(result?.recommended).not.toContain('.unvalidated-model');
      expect(result?.recommended).toContain(SONNET);
    });

    it('does not allow an unvalidated newer model to displace a validated older one in the same family', () => {
      const result = deriveRecommendations([
        makeEndpoint('.unvalidated-new', {
          capability: 'capable',
          family: 'claude-sonnet',
          releaseDate: '2026-01-01',
        }),
        makeEndpoint(SONNET, {
          capability: 'capable',
          family: 'claude-sonnet',
          releaseDate: '2025-01-01',
        }),
        makeEndpoint(HAIKU, {
          capability: 'efficient',
          family: 'claude-haiku',
          releaseDate: '2025-01-01',
        }),
      ]);
      expect(result?.recommended).toContain(SONNET);
      expect(result?.recommended).not.toContain('.unvalidated-new');
    });
  });

  describe('successful result shape', () => {
    it('returns correct inference IDs in both lists', () => {
      const result = deriveRecommendations([
        makeEndpoint(SONNET, {
          capability: 'capable',
          family: 'claude-sonnet',
          releaseDate: '2025-01-01',
        }),
        makeEndpoint(HAIKU, {
          capability: 'efficient',
          family: 'claude-haiku',
          releaseDate: '2025-01-01',
        }),
      ]);
      expect(result).toEqual({ recommended: [SONNET], fast: [HAIKU] });
    });
  });
});
