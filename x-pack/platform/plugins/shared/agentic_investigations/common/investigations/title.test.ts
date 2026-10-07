/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_CONVERSATION_TITLE } from '@kbn/agent-builder-common';
import { isInvestigationTitlePending } from './title';

describe('isInvestigationTitlePending', () => {
  it.each([undefined, '', '   ', DEFAULT_CONVERSATION_TITLE])(
    'treats %p as not generated yet',
    (title) => {
      expect(isInvestigationTitlePending(title)).toBe(true);
    }
  );

  it('treats any other title as generated', () => {
    expect(isInvestigationTitlePending('Checkout latency spike')).toBe(false);
  });
});
