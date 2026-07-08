/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { createAgentBuilderSmlService } from './service';

describe('createAgentBuilderSmlService', () => {
  it('setup().registerType registers a type retrievable via start().getTypeDefinition', () => {
    const instance = createAgentBuilderSmlService();
    const setup = instance.setup({ logger: loggerMock.create() });
    setup.registerType({
      id: 'widget',
      async *list() {
        yield [];
      },
      getSmlEntry: async () => undefined,
      toAttachment: async () => undefined,
    });
    const start = instance.start({ logger: loggerMock.create() });
    expect(start.getTypeDefinition('widget')?.id).toBe('widget');
  });
});
