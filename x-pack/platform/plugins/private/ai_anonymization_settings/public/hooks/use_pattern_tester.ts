/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useState } from 'react';
import type { RegexAnonymizationRule } from '@kbn/inference-common';
import { useKibana } from './use_kibana';

export interface PatternTestAnonymization {
  entityType: string;
  originalValue: string;
  mask: string;
  occurrences: number;
}

export interface PatternTestStats {
  valuesMasked: number;
  uniqueValues: number;
  rulesApplied: number;
}

export interface PatternTestResult {
  maskedInput: unknown;
  anonymizations: PatternTestAnonymization[];
  stats: PatternTestStats;
}

/**
 * Calls the ephemeral, non-persisting `/internal/inference/anonymization/_test` endpoint used
 * by the Pattern tester tab and the Add/Edit pattern flyout's inline preview.
 */
export function usePatternTester() {
  const {
    services: { http, notifications },
  } = useKibana();

  const [result, setResult] = useState<PatternTestResult | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const test = useCallback(
    async (input: unknown, rules: RegexAnonymizationRule[]) => {
      setIsLoading(true);
      setError(undefined);
      try {
        const response = await http.post<PatternTestResult>(
          '/internal/inference/anonymization/_test',
          { body: JSON.stringify({ input, rules }) }
        );
        setResult(response);
        return response;
      } catch (e) {
        const bodyMessage = (e as { body?: { message?: string } })?.body?.message;
        const message = bodyMessage ?? (e instanceof Error ? e.message : String(e));
        setError(message);
        notifications.toasts.addDanger({ title: message });
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [http, notifications]
  );

  return { test, result, isLoading, error };
}
