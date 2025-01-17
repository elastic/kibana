/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAnonymizationTooltip } from '.';
import {
  SHOW_ANONYMIZED,
  SHOW_REAL_VALUES,
  THIS_CONVERSATION_DOES_NOT_INCLUDE_ANONYMIZED_FIELDS,
} from '../translations';

describe('getAnonymizationTooltip', () => {
  it('returns the expected tooltip when conversationHasReplacements is false', () => {
    const result = getAnonymizationTooltip({
      conversationHasReplacements: false, // <-- false
      showAnonymizedValuesChecked: false,
    });

    expect(result).toBe(THIS_CONVERSATION_DOES_NOT_INCLUDE_ANONYMIZED_FIELDS);
  });

  it('returns SHOW_REAL_VALUES when showAnonymizedValuesChecked is true', () => {
    const result = getAnonymizationTooltip({
      conversationHasReplacements: true,
      showAnonymizedValuesChecked: true, // <-- true
    });

    expect(result).toBe(SHOW_REAL_VALUES);
  });

  it('returns SHOW_ANONYMIZED when showAnonymizedValuesChecked is false', () => {
    const result = getAnonymizationTooltip({
      conversationHasReplacements: true,
      showAnonymizedValuesChecked: false, // <-- false
    });

    expect(result).toBe(SHOW_ANONYMIZED);
  });
});
