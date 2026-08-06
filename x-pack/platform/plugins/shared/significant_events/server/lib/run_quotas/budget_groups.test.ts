/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  COUNTED_WORKFLOW_BUDGET_GROUPS,
  COUNTED_WORKFLOW_IDS,
  workflowIdsInBudgetGroup,
} from './budget_groups';

describe('counted workflow budget groups', () => {
  it('maps each counted parent workflow to exactly one budget group', () => {
    expect(COUNTED_WORKFLOW_BUDGET_GROUPS).toEqual({
      [SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID]: 'ki_extraction',
      [SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID]: 'memory',
      [SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID]: 'memory',
      [SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID]: 'memory',
      [SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_WORKFLOW_ID]: 'memory',
      [SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID]: 'detection',
      [SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID]: 'investigation',
    });
  });

  it('does not count KI child workflows (avoids double-counting a parent run)', () => {
    expect(COUNTED_WORKFLOW_IDS).not.toContain(
      SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID
    );
    expect(COUNTED_WORKFLOW_IDS).not.toContain(
      SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID
    );
  });

  it('lists every memory sibling under the shared memory group', () => {
    expect(workflowIdsInBudgetGroup('memory').sort()).toEqual(
      [
        SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID,
        SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
        SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
        SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_WORKFLOW_ID,
      ].sort()
    );
  });
});
