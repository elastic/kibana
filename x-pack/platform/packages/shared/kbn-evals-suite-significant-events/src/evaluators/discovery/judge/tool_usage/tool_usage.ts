/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common';
import { extractToolCallIds } from '../../utils/tool_usage';

const { executeEsql: TOOL_ID_EXECUTE_ESQL } = platformCoreTools;
const { searchKnowledgeIndicators: TOOL_ID_KI_SEARCH } = platformSignificantEventsTools;
import type { DiscoveryJudgeEvaluator } from '../../types';

export const createToolUsageEvaluator = (): DiscoveryJudgeEvaluator => ({
  name: 'trajectory',
  kind: 'CODE',
  evaluate: ({ output }) => {
    // Use output.inputDiscoveries — the actual discoveries fed to the agent — rather than
    // input.discoveries (canonical ground truth). In snapshot mode the two differ: snapshot
    // discoveries may have different evidence/query coverage than the canonical dataset, so
    // allEvidencesHaveQuery must reflect what the agent actually received.
    const discoveries = output.inputDiscoveries ?? [];

    // Does at least one discovery need KI search (no pre-populated queries)?
    // Per-discovery check avoids falsely routing the entire batch to "both tools required"
    // when only one of several fully-evidenced discoveries is missing queries.
    const anyDiscoveryNeedsKiSearch = discoveries.some((d) => {
      const evidences = d.evidences ?? [];
      return (
        evidences.length === 0 || evidences.some((e) => e.esql_query == null || e.esql_query === '')
      );
    });
    const allEvidencesHaveQuery = discoveries.length > 0 && !anyDiscoveryNeedsKiSearch;

    const calledTools = new Set(extractToolCallIds(output.steps ?? []));
    const calledKiSearch = calledTools.has(TOOL_ID_KI_SEARCH);
    const calledEsql = calledTools.has(TOOL_ID_EXECUTE_ESQL);

    if (allEvidencesHaveQuery) {
      // All evidences already carry queries — judge should re-verify directly via execute_esql
      // and skip search_knowledge_indicators entirely.
      if (!calledEsql && calledKiSearch) {
        return Promise.resolve({
          score: 0,
          label: 'wrong-tools',
          explanation:
            'Called search_knowledge_indicators instead of execute_esql — all input evidences had esql_query; KI search should have been skipped',
        });
      }
      if (!calledEsql) {
        return Promise.resolve({
          score: 0,
          label: 'missing-esql',
          explanation:
            'execute_esql was not called — required for evidence re-verification before promoting',
        });
      }
      if (calledKiSearch) {
        return Promise.resolve({
          score: 0.5,
          label: 'unnecessary-ki-search',
          explanation:
            'execute_esql called correctly but search_knowledge_indicators was also called — all input evidences carried esql_query, so KI search was unnecessary',
        });
      }
      return Promise.resolve({
        score: 1,
        label: 'correct',
        explanation:
          'Correctly called execute_esql only — KI search skipped as expected when all evidences have pre-populated esql_query',
      });
    }

    const expected = [TOOL_ID_KI_SEARCH, TOOL_ID_EXECUTE_ESQL];
    const missing = expected.filter((t) => !calledTools.has(t));
    const score = (expected.length - missing.length) / expected.length;

    return Promise.resolve({
      score,
      label: score === 1 ? 'correct' : 'missing-tools',
      explanation:
        score === 1 ? 'Correctly called all tools' : `Missing tools: ${missing.join(', ')}`,
    });
  },
});
