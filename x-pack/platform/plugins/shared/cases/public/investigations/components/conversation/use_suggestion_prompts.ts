/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { useItems } from '../../hooks';
import * as i18n from './translations';

/** Used when the record has no IP indicator yet. */
const FALLBACK_INDICATOR = '203.0.113.44';

export interface SuggestionPrompt {
  id: 'summarize' | 'block' | 'claim';
  /** Text of the chip. */
  label: string;
  /** Shorter text for the side panel. */
  compactLabel: string;
  /** What is sent to the agent. */
  prompt: string;
}

const INDICATOR_REQUEST = {
  kind: ['evidence' as const],
  type: ['indicator' as const],
  indicator_type: ['ip' as const],
  sort_field: 'created_at' as const,
  sort_order: 'asc' as const,
  per_page: 1,
};

/** Prompts for the suggestion chips, built from the record's first IP indicator. */
export const useSuggestionPrompts = (record: InvestigationRecord): SuggestionPrompt[] => {
  const { data } = useItems(record.id, INDICATOR_REQUEST);
  const first = data?.items[0];
  const indicator =
    first && first.kind === 'evidence' && first.evidence.indicator
      ? first.evidence.indicator.value
      : FALLBACK_INDICATOR;

  return useMemo(
    () => [
      {
        id: 'summarize',
        label: i18n.SUGGESTION_SUMMARIZE,
        compactLabel: i18n.SUGGESTION_SUMMARIZE_SHORT,
        prompt: i18n.SUGGESTION_SUMMARIZE,
      },
      {
        id: 'block',
        label: i18n.SUGGESTION_BLOCK(indicator),
        compactLabel: i18n.SUGGESTION_BLOCK_SHORT(indicator),
        prompt: i18n.SUGGESTION_BLOCK(indicator),
      },
      {
        id: 'claim',
        label: i18n.SUGGESTION_CLAIM(indicator),
        compactLabel: i18n.SUGGESTION_CLAIM(indicator),
        prompt: i18n.SUGGESTION_CLAIM(indicator),
      },
    ],
    [indicator]
  );
};
