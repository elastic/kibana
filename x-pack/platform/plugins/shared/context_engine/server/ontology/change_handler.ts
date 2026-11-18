/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { discoversOntology } from '../../common/ontology';
import type { AiIndexChangeHandler } from '../ai_indices/changes';
import type { OntologyScheduleService } from './schedule';

export const ONTOLOGY_CHANGE_HANDLER_ID = 'ontology_schedule';

/**
 * Reconciles the ontology discovery workflows of an AI index when its sources, dreaming config or
 * dest is saved, and removes them, with what they wrote, when it is deleted. While dreaming is
 * unavailable, it only removes workflows.
 */
export const createOntologyChangeHandler = (
  getScheduleService: () => OntologyScheduleService,
  isDreamingAvailable: (spaceId: string) => Promise<boolean>
): AiIndexChangeHandler => ({
  id: ONTOLOGY_CHANGE_HANDLER_ID,
  fields: ['sources', 'dreaming', 'dest'],
  when: 'saved',
  onChange: async ({ spaceId, request, previous, current }) => {
    if (!current) {
      if (previous) {
        await getScheduleService().remove({ previous, spaceId, request });
      }
      return;
    }
    if (discoversOntology(current) && !(await isDreamingAvailable(spaceId))) {
      return;
    }
    await getScheduleService().reconcile({ aiIndex: current, previous, spaceId, request });
  },
});
