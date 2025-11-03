/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSharedIcon } from './utils';
import { ConversationSharedState } from '@kbn/elastic-assistant-common';

describe('getSharedIcon', () => {
  it('returns users for Shared', () => {
    expect(getSharedIcon(ConversationSharedState.SHARED)).toBe('users');
  });
  it('returns readOnly for Restricted', () => {
    expect(getSharedIcon(ConversationSharedState.RESTRICTED)).toBe('readOnly');
  });
  it('returns lock for Private', () => {
    expect(getSharedIcon(ConversationSharedState.PRIVATE)).toBe('lock');
  });
  it('returns lock for unknown state', () => {
    expect(getSharedIcon('unknown' as ConversationSharedState)).toBe('lock');
  });
});
