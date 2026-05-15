/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { ComposeFormValues, RuleQuery } from './compose_form_types';
import type { SandboxDraft } from './types';

function queryToDraftFields(query: RuleQuery): Pick<SandboxDraft, 'base' | 'breach' | 'recover'> {
  if (query.format === 'composed') {
    return { base: query.base, breach: query.blocks.breach, recover: query.blocks.recover ?? '' };
  }
  return { base: '', breach: query.breach, recover: query.recover ?? '' };
}

export function draftToRuleQuery(draft: SandboxDraft, tracking: boolean): RuleQuery {
  if (tracking) {
    return {
      format: 'composed',
      base: draft.base,
      blocks: {
        breach: draft.breach,
        ...(draft.recover.trim() ? { recover: draft.recover } : {}),
      },
    };
  }
  return { format: 'standalone', breach: draft.breach };
}

export const useSandboxDraft = (methods: UseFormReturn<ComposeFormValues>) => {
  const [draft, setDraft] = useState<SandboxDraft>(() => ({
    ...queryToDraftFields(methods.getValues('query')),
    dateStart: 'now-15m',
    dateEnd: 'now',
  }));

  const resetFromRhf = useCallback(() => {
    setDraft((d) => ({ ...d, ...queryToDraftFields(methods.getValues('query')) }));
  }, [methods]);

  return { draft, setDraft, resetFromRhf };
};
