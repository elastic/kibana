/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '@kbn/inference-plugin/common';
import { RCA_INVESTIGATE_ENTITY_TOOL_NAME } from '@kbn/observability-utils-common/llm/root_cause_analysis';
import { RootCauseAnalysisContext } from '../types';

export function getPreviouslyInvestigatedEntities({
  events,
}: Pick<RootCauseAnalysisContext, 'events'>) {
  const investigationToolResponses = events.filter((event) => {
    return event.role === MessageRole.Tool && event.name === RCA_INVESTIGATE_ENTITY_TOOL_NAME;
  });

  return investigationToolResponses.map((event) => event.response.entity);
}
