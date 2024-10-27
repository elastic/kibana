/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservationStepSummary } from './observe';

export function stringifySummaries(summaries: ObservationStepSummary[]): string {
  return summaries.length
    ? `# Previous observations
  
  ${summaries.map((summary, index) => {
    return `## Observation #${index + 1}
    ${
      summary.investigations.length
        ? `### Investigated entities:

      ${summary.investigations
        .map((investigation) => `- ${JSON.stringify(investigation.entity)}`)
        .join('\n')}`
        : ``
    }
      
      ### Summary

      ${summary.content}`;
  })}

  <end of previous observations>
  `
    : '';
}
