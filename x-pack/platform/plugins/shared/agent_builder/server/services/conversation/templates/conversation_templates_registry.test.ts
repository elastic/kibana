/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';
import { createConversationTemplateRegistry } from './conversation_templates_registry';

const noteTemplate: ConversationTemplate = {
  id: 'note',
  version: 1,
  name: 'Note',
  description: 'test fixture',
  fields: {
    summary: { input_type: 'TEXT', description: 'x', required: true, max_length: 100 },
  },
};

const otherTemplate: ConversationTemplate = {
  ...noteTemplate,
  id: 'other',
  name: 'Other',
};

describe('ConversationTemplateRegistry', () => {
  it('registers and returns templates by id', async () => {
    const registry = createConversationTemplateRegistry();
    registry.register(noteTemplate);
    await expect(registry.get('note')).resolves.toBe(noteTemplate);
    await expect(registry.has('note')).resolves.toBe(true);
  });

  it('returns undefined for an unknown id', async () => {
    const registry = createConversationTemplateRegistry();
    await expect(registry.get('missing')).resolves.toBeUndefined();
    await expect(registry.has('missing')).resolves.toBe(false);
  });

  it('lists every registered template', async () => {
    const registry = createConversationTemplateRegistry();
    registry.register(noteTemplate);
    registry.register(otherTemplate);
    await expect(registry.list()).resolves.toEqual(
      expect.arrayContaining([noteTemplate, otherTemplate])
    );
    await expect(registry.list()).resolves.toHaveLength(2);
  });

  it('throws when the same id is registered twice', () => {
    const registry = createConversationTemplateRegistry();
    registry.register(noteTemplate);
    expect(() => registry.register(noteTemplate)).toThrow(/already registered/i);
  });

  it('throws when the template shape is invalid', () => {
    const registry = createConversationTemplateRegistry();
    // SELECT without `options` is caught by validateTemplateDefinition.
    const invalid: ConversationTemplate = {
      id: 'invalid',
      version: 1,
      name: 'Invalid',
      description: 'test fixture',
      fields: {
        status: { input_type: 'SELECT', description: 'x', required: true } as never,
      },
    };
    expect(() => registry.register(invalid)).toThrow(/invalid/i);
  });
});
