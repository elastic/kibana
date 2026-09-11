/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';
import { ConversationTemplatesService } from './conversation_templates_service';

const template: ConversationTemplate = {
  id: 'note',
  version: 1,
  name: 'Note',
  description: 'test fixture',
  fields: {
    summary: { input_type: 'TEXT', description: 'x', required: true, max_length: 100 },
  },
};

describe('ConversationTemplatesService', () => {
  it('setup.register makes the template visible via start.get', async () => {
    const service = new ConversationTemplatesService();
    service.setup().register(template);
    const start = service.start();
    await expect(start.get('note')).resolves.toBe(template);
  });

  it('start.list returns registered templates', async () => {
    const service = new ConversationTemplatesService();
    service.setup().register(template);
    const start = service.start();
    await expect(start.list()).resolves.toEqual([template]);
  });

  it('duplicate registration throws', () => {
    const service = new ConversationTemplatesService();
    const setup = service.setup();
    setup.register(template);
    expect(() => setup.register(template)).toThrow(/already registered/i);
  });
});
