/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenJsonStrings } from '@kbn/ai-anonymization-server';
import { templateVariablePathsToAnonymize } from './anonymize_chat_template';

describe('templateVariablePathsToAnonymize', () => {
  it('keeps field_syntax and phase and masks alert text', () => {
    const flattened = flattenJsonStrings({
      alerts: ['host-a ran a process'],
      field_syntax:
        'Use {{ field.name fieldValue }} for every source field. Correct: {{ host.name host-a }}.',
      phase: 'generate',
      partial: '{"insights":[]}',
    });

    expect(templateVariablePathsToAnonymize(flattened)).toEqual(['/alerts/0', '/partial']);
  });
});
