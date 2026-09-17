/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scopeConversationId } from './tool_utils';

/** Docker's container name rule, which the sandbox service applies to `sandbox-<scoped id>`. */
const DOCKER_CONTAINER_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

describe('scopeConversationId', () => {
  it('namespaces the conversation by space', () => {
    expect(scopeConversationId('default', 'conv-1')).toBe('default__conv-1');
    expect(scopeConversationId('marketing', 'conv-1')).toBe('marketing__conv-1');
  });

  it('keeps different spaces on separate workspaces', () => {
    expect(scopeConversationId('default', 'conv-1')).not.toBe(
      scopeConversationId('marketing', 'conv-1')
    );
  });

  // A separator outside [a-zA-Z0-9_.-] makes the sandbox service fail to allocate a container,
  // which surfaces as every sandbox tool call erroring out rather than as a naming problem.
  it('produces an id the sandbox can use as a container name', () => {
    const spaceIds = ['default', 'marketing', 'space-with-dash', 'space_with_underscore'];

    for (const spaceId of spaceIds) {
      const scoped = scopeConversationId(spaceId, '95c9734f-b913-4459-9ec9-93034615bfe3');
      expect(`sandbox-${scoped}`).toMatch(DOCKER_CONTAINER_NAME);
    }
  });
});
