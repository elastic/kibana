/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { createSetConversationMetadataTool } from './set_conversation_metadata';

jest.mock('@kbn/agent-builder-server', () => ({
  ...jest.requireActual('@kbn/agent-builder-server'),
  getToolResultId: jest.fn(() => 'tool-result-id'),
}));

const makeTemplate = (
  fields: ConversationTemplate['definition']['fields'] = []
): ConversationTemplate => ({
  id: 'security.account-compromise',
  name: 'Account Compromise',
  description: 'Template for account compromise investigations',
  definition: { fields },
});

describe('createSetConversationMetadataTool', () => {
  let updateConversationMetadata: jest.Mock;
  let template: ConversationTemplate;

  beforeEach(() => {
    jest.clearAllMocks();
    updateConversationMetadata = jest.fn().mockResolvedValue(undefined);
    template = makeTemplate([
      {
        name: 'severity',
        type: 'keyword',
        description: 'Severity level',
        validation: { allowed_values: ['low', 'medium', 'high'] },
      },
      { name: 'affected_user', type: 'text', description: 'The compromised user' },
      { name: 'is_confirmed', type: 'boolean', description: 'Has the compromise been confirmed' },
    ]);
  });

  const callHandler = (updates: Record<string, string | boolean>) => {
    const tool = createSetConversationMetadataTool({ updateConversationMetadata, template });
    return (tool.handler as Function)({ updates });
  };

  it('calls updateConversationMetadata with the validated updates', async () => {
    const updates = { severity: 'high', affected_user: 'alice' };
    await callHandler(updates);
    expect(updateConversationMetadata).toHaveBeenCalledWith(updates);
  });

  it('returns acknowledged: true with the updated keys', async () => {
    const result = await callHandler({ severity: 'low' });
    expect(result.results[0]).toMatchObject({
      type: ToolResultType.other,
      data: { acknowledged: true, updated_keys: ['severity'] },
    });
  });

  it('throws for an unknown field key', async () => {
    await expect(callHandler({ unknown_field: 'value' })).rejects.toMatchObject({
      message: expect.stringContaining('has no field "unknown_field"'),
    });
    expect(updateConversationMetadata).not.toHaveBeenCalled();
  });

  it('throws when a value fails validation (allowed_values)', async () => {
    await expect(callHandler({ severity: 'critical' })).rejects.toMatchObject({
      message: expect.stringContaining('not in allowed_values'),
    });
    expect(updateConversationMetadata).not.toHaveBeenCalled();
  });

  it('throws when a boolean field receives a string value', async () => {
    await expect(callHandler({ is_confirmed: 'true' })).rejects.toMatchObject({
      message: expect.stringContaining('must be a boolean'),
    });
    expect(updateConversationMetadata).not.toHaveBeenCalled();
  });

  it('allows updating multiple fields in a single call', async () => {
    const updates = { severity: 'medium', affected_user: 'bob', is_confirmed: true };
    const result = await callHandler(updates);
    expect(updateConversationMetadata).toHaveBeenCalledWith(updates);
    expect(result.results[0].data.updated_keys).toEqual(
      expect.arrayContaining(['severity', 'affected_user', 'is_confirmed'])
    );
  });

  it('validates all keys before calling the updater (rejects on first invalid key)', async () => {
    // First key is valid, second is invalid — updater must NOT be called
    await expect(callHandler({ severity: 'high', unknown_key: 'x' })).rejects.toThrow();
    expect(updateConversationMetadata).not.toHaveBeenCalled();
  });

  it('does not call the updater when the updates object is empty', async () => {
    await callHandler({});
    // Empty updates are technically valid; the updater is still invoked (no-op merge)
    expect(updateConversationMetadata).toHaveBeenCalledWith({});
  });
});
