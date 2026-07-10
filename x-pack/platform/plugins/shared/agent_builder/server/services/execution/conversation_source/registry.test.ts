/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationSourceType } from '@kbn/agent-builder-common';
import { sourceAdapters } from './registry';
import { SlackSourceAdapter } from './slack/slack';

describe('sourceAdapters', () => {
  it('resolves the adapter for a registered source type', () => {
    expect(sourceAdapters[ConversationSourceType.Slack]).toBeInstanceOf(SlackSourceAdapter);
  });

  it('returns undefined for an unknown source type', () => {
    expect(sourceAdapters['github' as ConversationSourceType]).toBeUndefined();
  });
});
