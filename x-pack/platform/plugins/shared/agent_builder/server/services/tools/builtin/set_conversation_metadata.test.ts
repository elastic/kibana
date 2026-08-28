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

const makeTemplate = (fields: ConversationTemplate['fields'] = {}): ConversationTemplate => ({
  id: 'test-template',
  version: 1,
  name: 'Test Template',
  description: 'Template for tests',
  fields,
});

describe('createSetConversationMetadataTool', () => {
  let updateConversationMetadata: jest.Mock;
  let template: ConversationTemplate;

  beforeEach(() => {
    jest.clearAllMocks();
    updateConversationMetadata = jest.fn().mockResolvedValue(undefined);
    template = makeTemplate({
      severity: {
        input_type: 'SELECT',
        description: 'Severity level',
        options: ['low', 'medium', 'high'],
      },
      affected_user: { input_type: 'TEXT', description: 'The affected user' },
      is_confirmed: { input_type: 'TOGGLE', description: 'Has the incident been confirmed' },
      score: { input_type: 'NUMBER', description: 'Risk score', min: 0, max: 10 },
      tags: { input_type: 'TEXT_ARRAY', description: 'Labels for this finding' },
    });
  });

  const callHandler = (metadata: Record<string, unknown>) => {
    const tool = createSetConversationMetadataTool({ updateConversationMetadata, template });
    return (tool.handler as Function)({ metadata });
  };

  it('calls updateConversationMetadata with serialized metadata', async () => {
    const metadata = { severity: 'high', affected_user: 'alice' };
    await callHandler(metadata);
    expect(updateConversationMetadata).toHaveBeenCalledWith({
      severity: 'high',
      affected_user: 'alice',
    });
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

  it('throws when a SELECT value is not in options', async () => {
    await expect(callHandler({ severity: 'critical' })).rejects.toMatchObject({
      message: expect.stringContaining('allowed options'),
    });
    expect(updateConversationMetadata).not.toHaveBeenCalled();
  });

  it('throws when a TOGGLE field receives a string value', async () => {
    await expect(callHandler({ is_confirmed: 'true' })).rejects.toMatchObject({
      message: expect.stringContaining('TOGGLE'),
    });
    expect(updateConversationMetadata).not.toHaveBeenCalled();
  });

  it('serializes a TOGGLE boolean to a string in the stored value', async () => {
    await callHandler({ is_confirmed: true });
    expect(updateConversationMetadata).toHaveBeenCalledWith({ is_confirmed: 'true' });
  });

  it('serializes a NUMBER to a string in the stored value', async () => {
    await callHandler({ score: 7 });
    expect(updateConversationMetadata).toHaveBeenCalledWith({ score: '7' });
  });

  it('serializes a TEXT_ARRAY as a string array', async () => {
    await callHandler({ tags: ['alpha', 'beta'] });
    expect(updateConversationMetadata).toHaveBeenCalledWith({ tags: ['alpha', 'beta'] });
  });

  it('allows updating multiple fields in a single call', async () => {
    const metadata = { severity: 'medium', affected_user: 'bob', is_confirmed: false };
    const result = await callHandler(metadata);
    expect(updateConversationMetadata).toHaveBeenCalledWith({
      severity: 'medium',
      affected_user: 'bob',
      is_confirmed: 'false',
    });
    expect(result.results[0].data.updated_keys).toEqual(
      expect.arrayContaining(['severity', 'affected_user', 'is_confirmed'])
    );
  });

  it('validates all keys before calling the updater (rejects when any key is invalid)', async () => {
    // First key is valid, second is unknown — updater must NOT be called
    await expect(callHandler({ severity: 'high', unknown_key: 'x' })).rejects.toThrow();
    expect(updateConversationMetadata).not.toHaveBeenCalled();
  });

  it('invokes the updater even when the updates object is empty', async () => {
    await callHandler({});
    // Empty updates are valid; the updater is still called (no-op merge)
    expect(updateConversationMetadata).toHaveBeenCalledWith({});
  });
});
