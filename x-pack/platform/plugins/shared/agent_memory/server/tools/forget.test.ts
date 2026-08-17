/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { GetMemoryStorage } from '../types';
import { createForgetTool } from './forget';

describe('createForgetTool', () => {
  it('requires danger confirmation that identifies the soft-deleted memory', async () => {
    const tool = createForgetTool({
      getStorage: jest.fn() as GetMemoryStorage,
      getSecurityStart: jest.fn() as () => SecurityPluginStart,
      getCoreSecurity: jest.fn() as () => SecurityServiceStart,
    });

    expect(tool.confirmation?.askUser).toBe('always');
    const confirmation = await tool.confirmation?.getConfirmation?.({
      toolParams: { id: 'memory-123' },
    });

    expect(confirmation).toEqual({
      title: 'Forget memory "memory-123"',
      message:
        'Soft-delete this memory? It will no longer be recalled, but remains available for audit.',
      confirm_text: 'Forget memory',
      color: 'danger',
    });
  });
});
