/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import type { AlertEpisode } from '../queries/episodes_query';

export interface V1RuleOption {
  value: string;
  label: string;
}

/**
 * Accumulates classic (v1) rule id → name options from episode rows so the
 * rule filter dropdown keeps classic rules visible across filter changes.
 */
export const useV1RuleOptionsCache = (episodes?: AlertEpisode[]): V1RuleOption[] => {
  const [cache, setCache] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!episodes?.length) {
      return;
    }
    setCache((prev) => {
      let next: Record<string, string> | undefined;
      for (const row of episodes) {
        const id = row['rule.id'];
        if (row._is_v1 && id && !(id in (next ?? prev))) {
          next = next ?? { ...prev };
          next[id] = row._v1_rule_name ?? id;
        }
      }
      return next ?? prev;
    });
  }, [episodes]);

  return useMemo(() => Object.entries(cache).map(([value, label]) => ({ value, label })), [cache]);
};
