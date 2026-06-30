/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAfterFieldHelpText } from './get_after_field_help_text';

describe('getAfterFieldHelpText', () => {
  it('returns undefined when previous phase is hot', () => {
    expect(
      getAfterFieldHelpText({ previousPhase: 'hot', previousPhaseAfter: '0d' })
    ).toBeUndefined();
  });

  it('returns undefined when previous phase has no after value', () => {
    expect(
      getAfterFieldHelpText({ previousPhase: 'frozen', previousPhaseAfter: undefined })
    ).toBeUndefined();
  });

  it('formats the help text when previous phase and after exist', () => {
    expect(getAfterFieldHelpText({ previousPhase: 'frozen', previousPhaseAfter: '40d' })).toBe(
      'Must occur after the frozen phase (40d).'
    );
  });
});
