/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common';
import { extractToolCallIds } from '../../utils/tool_usage';

const { executeEsql: TOOL_ID_EXECUTE_ESQL } = platformCoreTools;
const {
  searchKnowledgeIndicators: TOOL_ID_KI_SEARCH,
  searchEvent: TOOL_ID_EVENT_SEARCH,
  discoveryWrite: TOOL_ID_DISCOVERY_WRITE,
} = platformSignificantEventsTools;
import type { DiscoveryEvaluator } from '../../types';

export const createDiscoveryToolUsageEvaluator = (): DiscoveryEvaluator => ({
  name: 'trajectory',
  kind: 'CODE',
  evaluate: ({ input, output }) => {
    const detections = output.inputDetections ?? input.detections ?? [];

    const calledTools = new Set(extractToolCallIds(output.steps ?? []));
    const calledEventSearch = calledTools.has(TOOL_ID_EVENT_SEARCH);
    const calledKiSearch = calledTools.has(TOOL_ID_KI_SEARCH);
    const calledEsql = calledTools.has(TOOL_ID_EXECUTE_ESQL);
    const calledDiscoveryWrite = calledTools.has(TOOL_ID_DISCOVERY_WRITE);

    // Empty batch — agent should return immediately with no tool calls.
    if (detections.length === 0) {
      const unexpectedCalls = calledTools.size;
      return Promise.resolve({
        score: unexpectedCalls === 0 ? 1 : 0,
        label: unexpectedCalls === 0 ? 'correct' : 'unexpected-tools',
        explanation:
          unexpectedCalls === 0
            ? 'Empty batch: no tool calls made as expected'
            : `Empty batch: agent made ${unexpectedCalls} unexpected tool call(s) instead of early-exiting`,
      });
    }

    const allQuiet = detections.every((d) => d.kind === 'quiet');

    if (allQuiet) {
      // All-quiet batch: event_search + KI search run; execute_esql must NOT run.
      if (!calledEventSearch) {
        return Promise.resolve({
          score: 0,
          label: 'missing-event-search',
          explanation:
            'All-quiet batch: event_search was not called — required once per batch to fetch open episodes before detection grouping',
        });
      }
      if (!calledKiSearch) {
        return Promise.resolve({
          score: 0,
          label: 'missing-ki-search',
          explanation:
            'All-quiet batch: search_knowledge_indicators was not called; KI search is mandatory to populate cause_kis and dependency context',
        });
      }
      if (calledEsql) {
        return Promise.resolve({
          score: 0.5,
          label: 'unnecessary-esql',
          explanation:
            'All-quiet batch: event_search and search_knowledge_indicators called correctly but execute_esql was also called — quiet rules must not trigger confirmation queries',
        });
      }
      if (!calledDiscoveryWrite) {
        return Promise.resolve({
          score: 0,
          label: 'missing-discovery-write',
          explanation: 'discovery_write was not called — required to emit at least one discovery',
        });
      }
      return Promise.resolve({
        score: 1,
        label: 'correct',
        explanation:
          'All-quiet batch: correctly called event_search and search_knowledge_indicators only — execute_esql skipped as required for quiet rules',
      });
    }

    const expected = [TOOL_ID_EVENT_SEARCH, TOOL_ID_KI_SEARCH, TOOL_ID_EXECUTE_ESQL];
    const missing = expected.filter((t) => !calledTools.has(t));
    const trajectoryScore = (expected.length - missing.length) / expected.length;

    if (!calledDiscoveryWrite) {
      return Promise.resolve({
        score: 0,
        label: 'missing-discovery-write',
        explanation: 'discovery_write was not called — required to emit at least one discovery',
      });
    }

    return Promise.resolve({
      score: trajectoryScore,
      label: trajectoryScore === 1 ? 'correct' : 'missing-tools',
      explanation:
        trajectoryScore === 1
          ? 'Correctly called all tools'
          : `Missing tools: ${missing.join(', ')}`,
    });
  },
});
