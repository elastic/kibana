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
    return {
      base: query.base,
      breach: query.breach.segment,
      recover: query.recovery?.segment ?? '',
    };
  }
  return { base: '', breach: query.breach.query, recover: query.recovery?.query ?? '' };
}

export function draftToRuleQuery(draft: SandboxDraft, tracking: boolean): RuleQuery {
  if (tracking) {
    return {
      format: 'composed',
      base: draft.base,
      breach: { segment: draft.breach },
      ...(draft.recover.trim() ? { recovery: { segment: draft.recover } } : {}),
    };
  }
  // Non-tracking rules have no separate recovery state; draft.recover is always
  // empty in this branch (DISABLE_TRACKING clears it), so we drop it intentionally.
  return { format: 'standalone', breach: { query: draft.breach } };
}

export const useSandboxDraft = (methods: UseFormReturn<ComposeFormValues>) => {
  const [draft, setDraft] = useState<SandboxDraft>(() => ({
    ...queryToDraftFields(methods.getValues('query')),
    timeField: methods.getValues('timeField'),
    dateStart: 'now-15m',
    dateEnd: 'now',
  }));

  const syncForm = useCallback(() => {
    setDraft((d) => ({
      ...d,
      ...queryToDraftFields(methods.getValues('query')),
      timeField: methods.getValues('timeField'),
    }));
  }, [methods]);

  return { draft, setDraft, syncForm };
};
