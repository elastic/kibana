/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';

interface AesopProposedSkill {
  id: string;
  name: string;
  description: string;
  markdown: string;
  content?: string;
  confidence: number;
  improvement_type?: 'new' | 'improvement' | 'customization';
  base_skill?: {
    id: string;
    name: string;
    readonly: boolean;
  };
  validation?: {
    status: 'pending' | 'validating' | 'passed' | 'failed';
    final_score?: number;
    suggestions?: string[];
    weaknesses?: string[];
  };
  review?: {
    status: 'pending_review' | 'approved' | 'rejected';
  };
}

interface AesopListResponse {
  skills: AesopProposedSkill[];
  total: number;
}

export interface AesopSkillSuggestion {
  proposedSkillId: string;
  proposedSkillName: string;
  proposedDescription: string;
  proposedContent: string;
  confidence: number;
  validationStatus: string;
  validationScore?: number;
  reviewStatus: string;
  suggestionsCount: number;
  weaknesses: string[];
  suggestions: string[];
}

/**
 * Fetches AESOP proposed skill improvements and builds a lookup map keyed by
 * the base (deployed) skill ID. This lets the skills list table show an
 * indicator when AESOP has discovered improvements for an existing skill.
 *
 * Only returns skills whose review status is 'pending_review' — approved/rejected
 * suggestions have already been actioned.
 */
export const useAesopSuggestions = () => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['aesop', 'skill-suggestions-for-list'],
    queryFn: async (): Promise<AesopListResponse> => {
      return http.get('/internal/aesop/skills/proposed', {
        query: {
          status: 'pending_review',
          limit: 100,
        },
        version: '1',
      });
    },
    // Silently fail — the evals plugin may not be enabled
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 min — shared between list and detail views
  });

  const suggestionsBySkillId = useMemo(() => {
    const map = new Map<string, AesopSkillSuggestion>();
    if (!data?.skills) return map;

    for (const skill of data.skills) {
      // Only include skills that are improvements to an existing base skill
      if (!skill.base_skill?.id) continue;

      const existing = map.get(skill.base_skill.id);
      // Keep the highest-confidence suggestion per base skill
      if (!existing || skill.confidence > existing.confidence) {
        map.set(skill.base_skill.id, {
          proposedSkillId: skill.id,
          proposedSkillName: skill.name,
          proposedDescription: skill.description,
          proposedContent: skill.markdown || skill.content || '',
          confidence: skill.confidence,
          validationStatus: skill.validation?.status ?? 'pending',
          validationScore: skill.validation?.final_score,
          reviewStatus: skill.review?.status ?? 'pending_review',
          suggestionsCount:
            (skill.validation?.suggestions?.length ?? 0) +
            (skill.validation?.weaknesses?.length ?? 0),
          weaknesses: skill.validation?.weaknesses ?? [],
          suggestions: skill.validation?.suggestions ?? [],
        });
      }
    }

    return map;
  }, [data]);

  return { suggestionsBySkillId, isLoading, isError };
};
